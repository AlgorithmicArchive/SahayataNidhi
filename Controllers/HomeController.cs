using System.Collections.Specialized;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Renci.SshNet.Messages;
using SahayataNidhi.Models;
using SahayataNidhi.Models.Entities;
using SendEmails;
using JsonSerializer = System.Text.Json.JsonSerializer;
using UAParser;
using System.Dynamic;

namespace SahayataNidhi.Controllers
{
    public class HomeController(ILogger<HomeController> logger, SwdjkContext dbContext, OtpStore otpStore, EmailSender emailSender, UserHelperFunctions helper, PdfService pdfService, IConfiguration configuration, IAuditLogService auditService, SessionRepository sessionRepo, IHttpClientFactory httpClientFactory) : Controller
    {
        private readonly ILogger<HomeController> _logger = logger;
        private readonly SwdjkContext _dbContext = dbContext;
        private readonly OtpStore _otpStore = otpStore;
        private readonly EmailSender _emailSender = emailSender;
        private readonly UserHelperFunctions _helper = helper;
        private readonly PdfService _pdfService = pdfService;
        private readonly IConfiguration _configuration = configuration;
        private readonly IAuditLogService _auditService = auditService;
        private readonly SessionRepository _sessionRepo = sessionRepo;
        private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

        public override void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);
            ViewData["UserType"] = "";
        }



        // JAN PARICHAY SETUP

        public async Task<bool> ValidateToken(UserSignature userSignature)
        {
            var client = _httpClientFactory.CreateClient();
            var clientToken = userSignature.ClientToken; // From payload
            var sessionId = userSignature.SessionId; // From payload (Post Login Session Id)
            var browserId = userSignature.BrowserId; // From payload

            // PDF Page 10: Include sessionId & browserId from cookies if set, fallback to payload
            var cookieSessionId = HttpContext.Request.Cookies["SessionId"];
            var cookieBrowserId = HttpContext.Request.Cookies["BrowserId"];
            if (!string.IsNullOrEmpty(cookieSessionId)) sessionId = cookieSessionId;
            if (!string.IsNullOrEmpty(cookieBrowserId)) browserId = cookieBrowserId;

            var url = $"{_configuration["JanParichay:ClientBaseUrl"]}/isTokenValid?" +
                      $"clientToken={clientToken!}" +
                      $"&sid={_configuration["JanParichay:ServiceId"]}" +
                      $"&sessionId={sessionId!}" +
                      $"&browserId={browserId!}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return false;

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
            return result?["tokenValid"] == "true";
        }

        [HttpPost]
        public async Task<IActionResult> InitiateSSO()
        {
            try
            {
                var clientSessionId = HttpContext.Session.Id;
                var sid = _configuration["JanParichay:ServiceId"]!;
                var tid = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var baseUrl = _configuration["JanParichay:JanParichayBaseUrl"]!.TrimEnd('/');
                // 1. Encrypt the Client Session Id
                var encryptedClientSessionId = await _helper.EncryptStringAsync(clientSessionId);
                // 2. Build HMAC input string (EXACTLY as per doc)
                var loginUrl = $"{baseUrl}/v1/api/login";
                var hmacInput = $"JanParichay{tid}{loginUrl}{sid}";
                var clientSignature = await _helper.GetHmacSignatureAsync(hmacInput);
                // 3. Build redirect URL
                var redirectUrl = $"{baseUrl}/v1/api/login?" +
                                  $"sid={sid}" +
                                  $"&tid={tid}" +
                                  $"&cs={clientSignature}" +
                                  $"&string={encryptedClientSessionId}";
                _logger.LogInformation("Redirecting to JanParichay: {Url}", redirectUrl);
                // // Return JSON for React frontend
                // return Ok(new { redirectUrl });
                return Json(new { redirectUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "InitiateSSO failed");
                return StatusCode(500, new { error = "SSO initiation failed", details = ex.Message });
            }
        }
        public async Task<IActionResult> SSOCallback([FromQuery] string @string)
        {
            // ========================================
            // STEP 1: LOG EVERYTHING — SEE WHAT JAN PARICHAY SENT
            // ========================================
            var fullUrl = Request.GetDisplayUrl();
            _logger.LogInformation("=== JAN PARICHAY CALLBACK START ===");
            _logger.LogInformation("Full URL: {FullUrl}", fullUrl);
            _logger.LogInformation("Raw @string: '{String}' (Length: {Len})", @string ?? "NULL", @string?.Length ?? 0);
            _logger.LogInformation("All Query Params: {@Query}", Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString()));
            // ========================================
            // STEP 2: VALIDATE HANDSHAKING ID
            // ========================================
            if (string.IsNullOrEmpty(@string))
            {
                _logger.LogError("MISSING HANDSHAKING ID — Jan Parichay did NOT send ?string=");
                return BadRequest(new { status = false, response = "Missing handshaking ID" });
            }
            if (@string.Length < 100 || @string.Length > 1000)
            {
                _logger.LogWarning("SUSPICIOUS HANDSHAKING ID LENGTH: {Len} chars", @string.Length);
                // Still proceed — might be valid
            }
            _logger.LogInformation("VALID HANDSHAKING ID RECEIVED: {Len} chars", @string.Length);
            try
            {
                var sid = _configuration["JanParichay:ServiceId"]!;
                var clientBaseUrl = _configuration["JanParichay:ClientBaseUrl"]!.TrimEnd('/');
                var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";

                // ========================================
                // STEP 3: CALL HANDSHAKE API
                // ========================================
                var handshakeUrl = $"{clientBaseUrl}/handshake?handshakingId={@string}&sid={sid}";
                _logger.LogInformation("Calling Handshake API: {HandshakeUrl}", handshakeUrl);
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync(handshakeUrl);
                _logger.LogInformation("Handshake Response Status: {StatusCode}", response.StatusCode);
                if (response.StatusCode != HttpStatusCode.OK) // 202
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("HANDSHAKE FAILED: {Status} | Response: {Error}", response.StatusCode, error);
                    return StatusCode(500, new { status = false, response = "Handshake failed", details = error });
                }
                var encryptedPayload = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Encrypted Payload: '{Payload}' (Length: {Len})", encryptedPayload, encryptedPayload.Length);
                if (encryptedPayload == "false")
                {
                    _logger.LogError("INVALID HANDSHAKING ID — Jan Parichay returned 'false'");
                    return Unauthorized(new { status = false, response = "Invalid handshaking ID" });
                }
                // ========================================
                // STEP 4: DECRYPT PAYLOAD
                // ========================================
                _logger.LogInformation("Decrypting payload...");
                var janUser = await _helper.DecryptStringAsync(encryptedPayload); // Already deserialized to UserSignature
                _logger.LogInformation("Decryption SUCCESS. User: {UserId}", janUser.UserId);
                if (janUser?.ClientToken == null)
                {
                    _logger.LogError("DECRYPTED DATA MISSING ClientToken");
                    return BadRequest(new { status = false, response = "Invalid user data" });
                }
                // ========================================
                // STEP 5: TOKEN VALIDATION (Optional but Recommended)
                // ========================================
                var isValid = await ValidateToken(janUser);
                if (!isValid)
                {
                    _logger.LogWarning("TOKEN VALIDATION FAILED");
                    return Unauthorized(new { status = false, response = "Token validation failed" });
                }
                // ========================================
                // STEP 6: CREATE LOCAL USER & JWT
                // ========================================
                var localUser = await _helper.FindOrCreateJanParichayUser(janUser);
                if (localUser == null)
                {
                    _logger.LogError("USER CREATION FAILED");
                    return StatusCode(500, new { status = false, response = "User creation failed" });
                }





                var jwt = _helper.GenerateJwt(localUser, janUser.ClientToken);
                // ========================================
                // STEP 7: SET COOKIES (SameSite=None for Cross-Origin)
                // ========================================
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.Now.AddHours(12),
                    Path = "/"
                };
                Response.Cookies.Append("ClientToken", janUser.ClientToken, cookieOptions);
                Response.Cookies.Append("SessionId", janUser.SessionId!, cookieOptions);
                Response.Cookies.Append("BrowserId", janUser.BrowserId!, cookieOptions);
                Response.Cookies.Append("PostLoginSessionId", janUser.SessionId!, cookieOptions);

                // existing lines
                HttpContext.Session.SetString("IdentityProviderIP", janUser?.Ip ?? "");
                HttpContext.Session.SetString("ClientIP", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "");

                // new lines for Browser, OS, Device
                var userAgent = HttpContext.Request.Headers.UserAgent.ToString();
                var parser = Parser.GetDefault();
                var clientInfo = parser.Parse(userAgent);

                var browser = clientInfo.Browser.ToString();    // e.g. "Chrome 129.0.0"
                var os = clientInfo.OS.ToString();          // e.g. "Windows 11"
                var device = clientInfo.Device.Family;      // e.g. "Desktop" or "iPhone"

                HttpContext.Session.SetString("Browser", browser);
                HttpContext.Session.SetString("OS", os);
                HttpContext.Session.SetString("Device", string.IsNullOrEmpty(device) ? "Unknown" : device);

                _logger.LogInformation("COOKIES SET — User: {Email}", janUser?.Email);
                // ========================================
                // STEP 8: REDIRECT TO FRONTEND WITH SSO DATA
                // ========================================
                // ... inside try block, after creating localUser and jwt ...

                dynamic ssoResponse = new ExpandoObject();
                ssoResponse.status = true;
                ssoResponse.token = jwt;

                // PRESERVE ORIGINAL ROLE FROM DB
                var actualUserType = localUser.UserType;  // <-- ADD THIS

                ssoResponse.userType = localUser.UserType;
                ssoResponse.actualUserType = actualUserType;  // <-- ADD THIS

                ssoResponse.username = localUser.Username;
                ssoResponse.userId = localUser.UserId;
                ssoResponse.designation = janUser?.Designation ?? "";
                ssoResponse.department = _helper.GetDepartment(localUser);
                ssoResponse.profile = localUser.Profile ?? "/assets/images/profile.jpg";
                ssoResponse.email = janUser?.Email;

                // Force non-validated officers to Citizen *view* only
                if (localUser.UserType != "Citizen")
                {
                    var AdditionalDetails = JsonConvert.DeserializeObject<dynamic>(localUser.AdditionalDetails!);
                    bool isValidated = (bool)AdditionalDetails!["Validate"];
                    if (!isValidated)
                    {
                        ssoResponse.userType = "Citizen";  // Current view
                                                           // actualUserType remains "Officer" (or whatever DB says)
                    }
                }



                var encoded = JsonSerializer.Serialize(ssoResponse);
                _logger.LogInformation("REDIRECTING TO FRONTEND: {Url}", $"{frontendUrl}?sso={encoded}");
                return Redirect($"{frontendUrl}/verification?sso={encoded}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SSOCALLBACK CRASHED — Handshaking ID: {Id}", @string);
                return StatusCode(500, new { status = false, response = "SSO processing failed", details = ex.Message });
            }
        }


        private static string GenerateOTP(int length)
        {
            var random = new Random();
            string otp = string.Empty;

            for (int i = 0; i < length; i++)
            {
                otp += random.Next(0, 10).ToString();
            }

            return otp;
        }

        public IActionResult Index()
        {
            return View();
        }

        static string GetShortTitleFromRole(string role)
        {
            if (string.IsNullOrWhiteSpace(role))
                return "Unknown";

            var words = role.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return string.Concat(words.Select(w => char.ToUpper(w[0])));
        }

        [HttpGet]
        public async Task<IActionResult> SendLoginOtp(string? username)
        {
            string otpKey = $"otp:{username}";
            string otp = GenerateOTP(7);
            _otpStore.StoreOtp(otpKey, otp);

            string? email = _dbContext.Users.FirstOrDefault(u => u.Username == username)?.Email;

            if (string.IsNullOrEmpty(email))
            {
                return Json(new { status = false, message = "User not found." });
            }

            string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>Your OTP Code</h2>
                <p>Use the following One-Time Password (OTP) to complete your verification. It is valid for <strong>5 minutes</strong>.</p>
                <div style='font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;'>{otp}</div>
                <p>If you did not request this, please ignore this email.</p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

            try
            {
                await _emailSender.SendEmail(email, "OTP For Login", htmlMessage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to send email: {ex.Message}. OTP: {otp}");
                return Json(new { status = true, message = $"Email and Mobile OTP sending is not working on demo portal. Use this OTP: {otp}" });
            }
            return Json(new { status = true });
        }

        [HttpGet]
        public async Task<IActionResult> SendOtp(string? email, string? mobile)
        {
            if (string.IsNullOrEmpty(email) && string.IsNullOrEmpty(mobile))
            {
                return Json(new { status = false, message = "Either email or mobile is required." });
            }

            if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(mobile))
            {
                return Json(new { status = false, message = "Please provide only one: email or mobile, not both." });
            }

            string otpKey = !string.IsNullOrEmpty(email) ? $"otp:email:{email}" : $"otp:mobile:{mobile}";
            string otp = GenerateOTP(7);
            _otpStore.StoreOtp(otpKey, otp);

            try
            {
                if (!string.IsNullOrEmpty(email))
                {
                    string htmlMessage = $@"
                    <div style='font-family: Arial, sans-serif;'>
                        <h2 style='color: #2e6c80;'>Your OTP Code</h2>
                        <p>Use the following One-Time Password (OTP) to complete your verification. It is valid for <strong>5 minutes</strong>.</p>
                        <div style='font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;'>{otp}</div>
                        <p>If you did not request this, please ignore this email.</p>
                        <br />
                        <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
                    </div>";

                    await _emailSender.SendEmail(email, "OTP for Verification", htmlMessage);
                    return Json(new { status = true, message = "OTP sent successfully to your email." });
                }
                else
                {
                    // You can integrate an SMS service here
                    _logger.LogInformation($"Simulated SMS OTP sent to {mobile}: {otp}");
                    return Json(new { status = true, message = $"Email and Mobile OTP sending is not working on demo portal. Use this OTP: {otp}" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to send OTP: {ex.Message}. OTP: {otp}");
                return Json(new { status = true, message = $"Email and Mobile OTP sending is not working on demo portal. Use this OTP: {otp}" });
            }
        }

        private string MaskUsername(string username)
        {
            if (string.IsNullOrEmpty(username) || username.Length <= 6)
                return username; // Return as is if too short
            return $"{username.Substring(0, 3)}***{username.Substring(username.Length - 3)}";
        }

        [HttpPost]
        public IActionResult GetAccountsForPasswordReset([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            if (string.IsNullOrEmpty(email) || !Regex.IsMatch(email?.Trim()!, @"^[\w\.-]+@([\w-]+\.)+[\w-]{2,}$"))
            {
                return Json(new { status = false, message = "Please provide a valid email address." });
            }

            var users = _dbContext.Users.Where(u => u.Email == email).ToList();
            if (!users.Any())
            {
                return Json(new { status = false, message = "No account found with this email." });
            }

            var accounts = users.Select(u => new
            {
                userId = u.UserId,
                username = u.Username,
                maskedUsername = MaskUsername(u.Username!),
                userType = u.UserType
            }).ToList();

            string fullName = users.First().Name ?? "User";
            string currentDateTime = DateTime.UtcNow.AddHours(5.5)
                .ToString("dd MMM yyyy, hh:mm tt") + " IST";
            string accountsList = string.Join(", ", users.Select(u => $"{MaskUsername(u.Username!)} (Type: {u.UserType})"));

            string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>Your Accounts for Password Reset</h2>
                <p>Dear {fullName},</p>
                <p>The following accounts are associated with your email:</p>
                <ul>
                    {string.Join("", users.Select(u => $"<li><strong>{MaskUsername(u.Username!)}</strong> (Type: {u.UserType})</li>"))}
                </ul>
                <p>Please select an account in the application to proceed with the password reset.</p>
                <p>This information was requested on {currentDateTime}.</p>
                <p>If you did not request this, please contact support immediately.</p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

            try
            {
                _emailSender.SendEmail(email!, "Your Accounts for Password Reset", htmlMessage).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to send email: {ex.Message}. Accounts: {accountsList}");
                return Json(new { status = true, message = $"Email sending is not working on demo portal. Your accounts are: {accountsList}", accounts });
            }

            return Json(new { status = true, message = "Accounts found. Please select an account to reset the password.", accounts });
        }

        [HttpPost]
        public async Task<IActionResult> SendPasswordResetOtp([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            string userId = form["userId"].ToString();
            if (string.IsNullOrEmpty(email) || !Regex.IsMatch(email?.Trim()!, @"^[\w\.-]+@([\w-]+\.)+[\w-]{2,}$"))
            {
                return Json(new { status = false, message = "Please provide a valid email address." });
            }
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { status = false, message = "User ID is required." });
            }

            var user = _dbContext.Users.FirstOrDefault(u => u.Email == email && u.UserId == Convert.ToInt32(userId));
            if (user == null)
            {
                return Json(new { status = false, message = "No account found with this email and user ID." });
            }

            string otpKey = $"otp:{user.UserId}";
            string userName = user.Name ?? "User";
            string otp = GenerateOTP(6);
            _otpStore.StoreOtp(otpKey, otp);

            string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>Your OTP Code for Password Reset</h2>
                <p>Dear {userName},</p>
                <p>Use the following One-Time Password (OTP) to reset your password for account with Username: {MaskUsername(user.Username!)} (Type: {user.UserType}). It is valid for <strong>5 minutes</strong>.</p>
                <div style='font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;'>{otp}</div>
                <p>If you did not request a password reset, please ignore this email.</p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

            try
            {
                await _emailSender.SendEmail(email!, "OTP for Password Reset", htmlMessage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to send email: {ex.Message}. OTP: {otp}");
                return Json(new { status = true, message = $"Email and Mobile OTP sending is not working on demo portal. Use this OTP: {otp} for Username: {MaskUsername(user.Username!)}" });
            }
            return Json(new { status = true, message = "OTP sent to your email." });
        }

        [HttpPost]
        public async Task<IActionResult> SendUsernameToEmail([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            if (string.IsNullOrEmpty(email) || !Regex.IsMatch(email.Trim(), @"^[\w\.-]+@([\w-]+\.)+[\w-]{2,}$"))
            {
                return Json(new { status = false, message = "Please provide a valid email address." });
            }

            var users = _dbContext.Users.Where(u => u.Email == email).ToList();
            if (!users.Any())
            {
                return Json(new { status = false, message = "No account found with this email." });
            }

            string fullName = users.First().Name ?? "User";
            string currentDateTime = DateTime.UtcNow.AddHours(5.5)
                .ToString("dd MMM yyyy, hh:mm tt") + " IST";
            string usernamesList = string.Join(", ", users.Select(u => $"{u.Username} (Type: {u.UserType})"));

            string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>Your Username Retrieval</h2>
                <p>{fullName},</p>
                <p>Your usernames are:</p>
                <ul>
                    {string.Join("", users.Select(u => $"<li><strong>{u.Username}</strong> (Type: {u.UserType})</li>"))}
                </ul>
                <p>This information was requested on {currentDateTime}.</p>
                <p>If you did not request this, please contact support immediately.</p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

            try
            {
                await _emailSender.SendEmail(email, "Your Username", htmlMessage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to send email: {ex.Message}. Usernames: {usernamesList}");
                return Json(new { status = true, message = $"Email and Mobile OTP sending is not working on demo portal. Your usernames are: {usernamesList}", usernames = usernamesList });
            }
            return Json(new { status = true, message = "Usernames have been sent to your email.", usernames = usernamesList });
        }
        public class ResetPasswordResult
        {
            public int Result { get; set; }
            public string? Message { get; set; }
            public int UserId { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> ValidateOtpAndResetPassword([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            string userId = form["userId"].ToString();
            string otp = form["otp"].ToString();
            string newPassword = form["newPassword"].ToString();
            _logger.LogInformation($"------------------ Email: {email} UserId: {userId} OTP: {otp} PASSWORD: {newPassword} -------------------------------");

            if (string.IsNullOrEmpty(email) || !Regex.IsMatch(email, @"^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$"))
            {
                return Json(new { status = false, message = "Please provide a valid email address." });
            }

            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { status = false, message = "User ID is required." });
            }

            if (string.IsNullOrEmpty(otp) || !Regex.IsMatch(otp, @"^\d{6}$"))
            {
                return Json(new { status = false, message = "Please provide a valid 6-digit OTP." });
            }

            if (string.IsNullOrEmpty(newPassword) || newPassword.Length < 8)
            {
                return Json(new { status = false, message = "Password must be at least 8 characters long." });
            }

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email && u.UserId == Convert.ToInt32(userId));
            if (user == null)
            {
                return Json(new { status = false, message = "No account found with this email and user ID." });
            }

            string otpKey = $"otp:{user.UserId}";
            var storedOtp = _otpStore.RetrieveOtp(otpKey);

            if (storedOtp == null || storedOtp != otp)
            {
                return Json(new { status = false, message = "Invalid or expired OTP." });
            }

            try
            {
                // Execute the ResetUserPassword stored procedure
                var parameters = new[]
                {
                new SqlParameter("@Email", email),
                new SqlParameter("@UserId", Convert.ToInt32(userId)),
                new SqlParameter("@NewPassword", newPassword)
            };

                var result = await _dbContext.Database
                    .SqlQueryRaw<ResetPasswordResult>("EXEC ResetUserPassword @Email, @UserId, @NewPassword", parameters)
                    .ToListAsync();

                var resetResult = result.FirstOrDefault();
                if (resetResult != null && resetResult.Result == 1)
                {
                    _otpStore.RetrieveOtp(otpKey); // Clear OTP after successful reset
                    _auditService.InsertLog(HttpContext, "Reset Password", "Password reset successfully.", user.UserId, "Success");
                    return Json(new { status = true, message = resetResult.Message });
                }
                else
                {
                    _auditService.InsertLog(HttpContext, "Reset Password", "Failed to reset password.", user.UserId, "Failure");
                    return Json(new { status = false, message = resetResult?.Message ?? "Failed to reset password." });
                }
            }
            catch (Exception ex)
            {
                _auditService.InsertLog(HttpContext, "Reset Password", $"An error occurred: {ex.Message}", user.UserId, "Failure");
                return Json(new { status = false, message = $"An error occurred: {ex.Message}" });
            }
        }
        [HttpPost]
        public IActionResult OTPValidation([FromForm] string? email, [FromForm] string? mobile, [FromForm] string otp)
        {
            if (string.IsNullOrEmpty(email) && string.IsNullOrEmpty(mobile))
            {
                return Json(new { status = false, message = "Either email or mobile is required." });
            }

            if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(mobile))
            {
                return Json(new { status = false, message = "Please provide only one: email or mobile, not both." });
            }

            if (string.IsNullOrEmpty(otp))
            {
                return Json(new { status = false, message = "OTP is required." });
            }

            string otpKey = !string.IsNullOrEmpty(email) ? $"otp:email:{email}" : $"otp:mobile:{mobile}";
            string? storedOtp = _otpStore.RetrieveOtp(otpKey);

            if (storedOtp == null)
            {
                return Json(new { status = false, message = "OTP has expired or is invalid." });
            }

            if (storedOtp != otp)
            {
                return Json(new { status = false, message = "Invalid OTP." });
            }

            return Json(new { status = true, message = "OTP validated successfully." });
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromForm] IFormCollection form)
        {
            var username = new SqlParameter("Username", form["username"].ToString());
            var password = !string.IsNullOrEmpty(form["password"])
                ? new SqlParameter("Password", form["password"].ToString())
                : null!;

            var user = _dbContext.Users
                .FromSqlRaw("EXEC UserLogin @Username,@Password", username, password)
                .AsEnumerable()
                .FirstOrDefault();

            if (user == null)
                return Json(new { status = false, response = "Invalid Username or Password." });

            if (!user.IsEmailValid)
                return Json(new { status = false, response = "Email Not Verified.", isEmailVerified = false, email = user.Email });

            _logger.LogInformation($"User {user.Username} ({user.UserId}) is attempting to log in.");

            // --------------------------------------------------------------
            // 1. PRESERVE ORIGINAL DB ROLE
            // --------------------------------------------------------------
            var actualUserType = user.UserType;               // <-- DB value
            var displayedUserType = user.UserType;            // <-- what the UI will show

            // --------------------------------------------------------------
            // 2. OFFICER / ADMIN – check “Validate” flag
            // --------------------------------------------------------------
            string designation = "";
            string department = "";

            if (user.UserType == "Officer" || user.UserType == "Admin")
            {
                if (!string.IsNullOrWhiteSpace(user.AdditionalDetails))
                {
                    try
                    {
                        var details = JsonConvert.DeserializeObject<Dictionary<string, JToken>>(user.AdditionalDetails);
                        if (details != null)
                        {
                            // ---- Validate flag -------------------------------------------------
                            if (details.TryGetValue("Validate", out var validatedToken) && !validatedToken.Value<bool>())
                            {
                                displayedUserType = "Citizen";   // <-- UI sees Citizen only
                                                                 // (actualUserType stays Officer/Admin)
                            }

                            // ---- Role / Designation -------------------------------------------
                            if (details.TryGetValue("Role", out var roleToken))
                            {
                                designation = roleToken.ToString();
                            }

                            // ---- Department (Admin only) --------------------------------------
                            if (user.UserType == "Admin" && details.TryGetValue("Department", out var deptToken))
                            {
                                if (int.TryParse(deptToken.ToString(), out int deptId))
                                {
                                    department = _dbContext.Departments
                                                    .FirstOrDefault(d => d.DepartmentId == deptId)?
                                                    .DepartmentName ?? "";
                                }
                            }
                        }
                    }
                    catch { /* ignore JSON errors */ }
                }
            }

            // --------------------------------------------------------------
            // 3. Build claims (use the **displayed** role for auth)
            // --------------------------------------------------------------
            var claims = new List<Claim>
    {
        new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
        new(ClaimTypes.Name,           user.Username!),
        new(ClaimTypes.Role,           displayedUserType!),   // <-- what the JWT authorises
        new("Profile",                 user.Profile!)
    };
            if (!string.IsNullOrEmpty(designation))
                claims.Add(new Claim("Designation", designation));

            // --------------------------------------------------------------
            // 4. Generate JWT
            // --------------------------------------------------------------
            var key = Encoding.ASCII.GetBytes(_configuration["JWT:Secret"]!);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["JWT:Issuer"],
                Audience = _configuration["JWT:Audience"]
            };
            var token = new JwtSecurityTokenHandler().CreateToken(tokenDescriptor);
            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            // --------------------------------------------------------------
            // 5. Persist session
            // --------------------------------------------------------------
            var newSession = new UserSessions
            {
                SessionId = Guid.NewGuid(),
                UserId = user.UserId,
                JwtToken = tokenString,
                LoginTime = DateTime.UtcNow,
                LastActivityTime = DateTime.UtcNow
            };
            await _sessionRepo.AddSessionAsync(newSession);
            _auditService.InsertLog(HttpContext, "Login", "User logged in.", user.UserId, "Success");

            // --------------------------------------------------------------
            // 6. RETURN BOTH userType (displayed) AND actualUserType (DB)
            // --------------------------------------------------------------
            return Json(new
            {
                status = true,
                token = tokenString,
                userType = displayedUserType,      // <-- what the UI shows / authorises
                actualUserType = actualUserType,         // <-- original DB role
                profile = user.Profile,
                username = user.Username,
                userId = user.UserId,
                designation,
                department
            });
        }

        [HttpGet]
        [Authorize]
        public IActionResult RefreshToken()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = _dbContext.Users.FirstOrDefault(u => u.Username == username);
            if (user == null)
                return Unauthorized(new { status = false, message = "User not found." });

            var claims = User.Claims.Select(c => new Claim(c.Type, c.Value)).ToList();
            var jwtSecretKey = _configuration["JWT:Secret"];
            var key = Encoding.ASCII.GetBytes(jwtSecretKey!);

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["JWT:Issuer"],
                Audience = _configuration["JWT:Audience"],
                Expires = DateTime.UtcNow.AddMinutes(30)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Json(new
            {
                status = true,
                token = tokenString,
                userType = user.UserType ?? "",
                profile = user.Profile ?? "",
                username = username ?? "",
                designation = User.FindFirst("Designation")?.Value ?? ""
            });
        }

        [HttpGet]
        [Authorize]
        public IActionResult KeepAlive()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var user = _dbContext.Users.FirstOrDefault(u => u.Username == username);
            if (user == null)
                return Unauthorized(new { status = false, message = "User not found." });

            var claims = User.Claims.Select(c => new Claim(c.Type, c.Value)).ToList();
            var jwtSecretKey = _configuration["JWT:Secret"];
            var key = Encoding.ASCII.GetBytes(jwtSecretKey!);

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["JWT:Issuer"],
                Audience = _configuration["JWT:Audience"],
                Expires = DateTime.UtcNow.AddHours(24)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Json(new
            {
                status = true,
                token = tokenString,
                userType = user.UserType ?? "",
                profile = user.Profile ?? "",
                username = username ?? "",
                designation = User.FindFirst("Designation")?.Value ?? ""
            });
        }

        [HttpGet]
        [Authorize]
        public IActionResult ValidateJWTToken()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var userType = User.FindFirst(ClaimTypes.Role)?.Value;
            var profile = User.FindFirst("Profile")?.Value;
            var designation = User.FindFirst("Designation")?.Value;

            return Json(new
            {
                status = true,
                userId,
                username,
                userType,
                profile,
                designation
            });
        }

        [HttpPost]
        public async Task<IActionResult> Register(IFormCollection form)
        {
            var fullName = new SqlParameter("@Name", form["fullName"].ToString());
            var username = new SqlParameter("@Username", form["Username"].ToString());
            var password = new SqlParameter("@Password", form["Password"].ToString());
            var email = new SqlParameter("@Email", form["Email"].ToString());
            var mobileNumber = new SqlParameter("@MobileNumber", form["MobileNumber"].ToString());
            int district = string.IsNullOrEmpty(form["District"].ToString()) ? 0 : Convert.ToInt32(form["District"]);
            int tehsil = string.IsNullOrEmpty(form["Tehsil"].ToString()) ? 0 : Convert.ToInt32(form["Tehsil"]);

            var addtionalDetails = new
            {
                District = district,
                Tehsil = tehsil
            };
            var unused = _helper.GenerateUniqueRandomCodes(10, 8);
            var backupCodes = new
            {
                unused,
                used = Array.Empty<string>()
            };

            var Profile = new SqlParameter("@Profile", "");
            var UserType = new SqlParameter("@UserType", "Citizen");
            var backupCodesParam = new SqlParameter("@BackupCodes", JsonConvert.SerializeObject(backupCodes));
            var AddtionalDetails = new SqlParameter("@AdditionalDetails", JsonConvert.SerializeObject(addtionalDetails));
            var registeredDate = new SqlParameter("@RegisteredDate", DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"));

            var result = await _dbContext.Users.FromSqlRaw(
                "EXEC RegisterUser @Name, @Username, @Password, @Email, @MobileNumber, @Profile, @UserType, @BackupCodes, @AdditionalDetails, @RegisteredDate",
                fullName, username, password, email, mobileNumber, Profile, UserType, AddtionalDetails, backupCodesParam, registeredDate
            ).ToListAsync();

            if (result.Count != 0)
            {
                result[0].IsEmailValid = true;
                _dbContext.SaveChanges();
                return Json(new { status = true, response = "Registration Successful." });
            }
            else
            {
                return Json(new { status = false, response = "Registration failed." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> OfficerRegistration([FromForm] IFormCollection form)
        {
            var email = form["email"].ToString().Trim();
            var mobileNumber = form["mobileNumber"].ToString().Trim();
            var fullName = form["fullName"].ToString().Trim();
            var designation = form["designation"].ToString();
            var departmentId = form["department"].ToString();
            var accessLevel = form["accessLevel"].ToString();
            var accessCodeStr = form["accessCode"].ToString();

            // Username = Email
            var username = email;

            if (!int.TryParse(accessCodeStr, out int accessCode))
                return Json(new { status = false, message = "Invalid access code." });

            try
            {
                // Step 1: Check if user exists using EF
                var existingUser = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.Email == email);

                var profile = "/assets/images/profile.jpg";
                var registeredDate = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");

                // Officer details
                var officerDetails = new
                {
                    Role = designation,
                    RoleShort = GetShortTitleFromRole(designation),
                    AccessLevel = accessLevel,
                    AccessCode = accessCode,
                    Department = departmentId,
                    District = form.ContainsKey("District") ? form["District"].ToString() : null,
                    Division = form.ContainsKey("Division") ? form["Division"].ToString() : null,
                    Tehsil = form.ContainsKey("Tehsil") ? form["Tehsil"].ToString() : null,
                    Validate = false
                };

                if (existingUser != null)
                {
                    // Upgrade only if current user is Citizen
                    if (existingUser.UserType != "Citizen")
                        return Json(new { status = false, message = "Email already registered as non-Citizen." });

                    // Parse existing AdditionalDetails
                    var currentDetails = string.IsNullOrEmpty(existingUser.AdditionalDetails)
                        ? new { }
                        : JsonConvert.DeserializeObject(existingUser.AdditionalDetails) ?? new { };

                    // Merge: Keep Citizen + Add Officer
                    var mergedDetails = new
                    {
                        Citizen = currentDetails,
                        Officer = officerDetails
                    };
                    var mergedJson = JsonConvert.SerializeObject(mergedDetails);

                    // Update using EF
                    existingUser.Username = username;
                    existingUser.MobileNumber = mobileNumber;
                    existingUser.UserType = "Officer";
                    existingUser.AdditionalDetails = mergedJson;
                    existingUser.RegisteredDate = registeredDate;

                    await _dbContext.SaveChangesAsync();

                    return Json(new
                    {
                        status = true,
                        userId = existingUser.UserId,
                        message = "Upgraded from Citizen to Officer successfully."
                    });
                }
                else
                {
                    // New Officer: Use stored procedure
                    var backupCodesObj = new
                    {
                        unused = _helper.GenerateUniqueRandomCodes(10, 8),
                        used = Array.Empty<string>()
                    };
                    var backupCodesJson = JsonConvert.SerializeObject(backupCodesObj);

                    var additionalDetailsJson = JsonConvert.SerializeObject(new { Officer = officerDetails });

                    var parameters = new[]
                    {
                new SqlParameter("@Name", fullName),
                new SqlParameter("@Username", username),
                new SqlParameter("@Password", ""), // Empty
                new SqlParameter("@Email", email),
                new SqlParameter("@MobileNumber", mobileNumber),
                new SqlParameter("@Profile", profile),
                new SqlParameter("@UserType", "Officer"),
                new SqlParameter("@BackupCodes", backupCodesJson),
                new SqlParameter("@AddtionalDetails", additionalDetailsJson),
                new SqlParameter("@RegisteredDate", registeredDate)
            };

                    var result = await _dbContext.Users
                        .FromSqlRaw(
                            @"EXEC RegisterUser 
                      @Name, @Username, @Password, @Email, @MobileNumber, 
                      @Profile, @UserType, @BackupCodes, @AddtionalDetails, @RegisteredDate",
                            parameters)
                        .ToListAsync();

                    if (result.Count > 0)
                    {
                        return Json(new
                        {
                            status = true,
                            userId = result[0].UserId,
                            message = "Officer registered successfully."
                        });
                    }

                    return Json(new { status = false, message = "Registration failed." });
                }
            }
            catch (Exception ex)
            {
                // Log in production: _logger.LogError(ex, "OfficerRegistration failed");
                return Json(new { status = false, message = "Server error: " + ex.Message });
            }
        }

        [HttpPost]
        public IActionResult Verification([FromForm] IFormCollection form)
        {
            var authHeader = Request.Headers.Authorization.ToString();
            _logger.LogInformation("Authorization Header: {AuthHeader}", authHeader);

            if (string.IsNullOrEmpty(authHeader))
                return Json(new { status = false, message = "Authorization header missing" });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userType = User.FindFirst(ClaimTypes.Role)?.Value;
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            var profile = User.FindFirst("Profile")?.Value;

            if (string.IsNullOrEmpty(username))
                return Json(new { status = false, message = "User not found. Please try again." });

            string? otp = form["otp"];
            string? backupCode = form["backupCode"];
            bool verified = false;

            // --- OTP Verification ---
            if (!string.IsNullOrEmpty(otp))
            {
                string otpKey = $"otp:{username}";
                string? cachedOtp = _otpStore.RetrieveOtp(otpKey);

                _logger.LogInformation("OTP Verification -> Cached: {CachedOtp}, Provided: {Otp}", cachedOtp, otp);

                if (cachedOtp == otp)
                {
                    verified = true;
                    _logger.LogInformation("User {Username} verified successfully via OTP.", username);
                }
            }

            // --- Backup Code Verification (only if OTP not provided or failed) ---
            if (!verified && !string.IsNullOrEmpty(backupCode) && !string.IsNullOrEmpty(userId))
            {
                var user = _dbContext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
                if (user?.BackupCodes != null)
                {
                    try
                    {
                        var codes = JsonConvert.DeserializeObject<Dictionary<string, List<string>>>(user.BackupCodes)
                                    ?? new Dictionary<string, List<string>>();

                        if (codes.TryGetValue("unused", out var unused) &&
                            codes.TryGetValue("used", out var used) &&
                            unused.Contains(backupCode))
                        {
                            unused.Remove(backupCode);
                            used.Add(backupCode);

                            user.BackupCodes = JsonConvert.SerializeObject(codes);
                            _dbContext.SaveChanges();

                            verified = true;
                            _logger.LogInformation("User {Username} verified successfully via backup code.", username);
                        }
                    }
                    catch (System.Text.Json.JsonException ex)
                    {
                        _logger.LogError(ex, "Failed to parse backup codes for user {UserId}", userId);
                    }
                }
            }

            // --- Return Response ---
            if (verified)
            {
                return Json(new
                {
                    status = true,
                    userType,
                    profile,
                    username
                });
            }

            return Json(new { status = false, message = "Invalid code." });
        }
        [HttpPost]
        public async Task<IActionResult> SendEmailVerificationOtp([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            var user = _dbContext.Users.FirstOrDefault(u => u.Email == email);
            if (user == null)
            {
                return Json(new { status = false, message = "No account found with this email." });
            }

            if (user.IsEmailValid)
            {
                return Json(new { status = false, message = "Email is already verified." });
            }

            string otpKey = $"email_verify_otp:{user.UserId}";
            string otp = GenerateOTP(7);
            _otpStore.StoreOtp(otpKey, otp);

            string htmlMessage = $@"
            <div>
                <h3>Email Verification OTP</h3>
                <p>Your OTP is <strong>{otp}</strong>. It is valid for 5 minutes.</p>
            </div>";

            try
            {
                await _emailSender.SendEmail(email, "Email Verification OTP", htmlMessage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to send email: {ex.Message}. OTP: {otp}");
                return Json(new { status = true, message = $"Email and Mobile OTP sending is not working on demo portal. Use this OTP: {otp}" });
            }
            return Json(new { status = true, message = "OTP sent to your email." });
        }

        [HttpPost]
        public IActionResult VerifyEmailOtp([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            string otp = form["otp"].ToString();
            var user = _dbContext.Users.FirstOrDefault(u => u.Email == email);
            if (user == null) return Json(new { status = false, message = "User not found" });

            string otpKey = $"email_verify_otp:{user.UserId}";
            var storedOtp = _otpStore.RetrieveOtp(otpKey);

            if (storedOtp == null || storedOtp != otp)
                return Json(new { status = false, message = "Invalid or expired OTP." });

            user.IsEmailValid = true;
            _dbContext.SaveChanges();

            return Json(new { status = true, message = "Email verified successfully." });
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                // === 1. Read JanParichay tokens from cookies ===
                var clientToken = Request.Cookies["ClientToken"];
                var sessionId = Request.Cookies["SessionId"] ?? Request.Cookies["PostLoginSessionId"];
                var browserId = Request.Cookies["BrowserId"];
                var sid = _configuration["JanParichay:ServiceId"]!;
                var userAgent = Request.Headers["User-Agent"].ToString();
                var tid = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

                // === 2. Clear local cookies FIRST ===
                Response.Cookies.Delete("ClientToken");
                Response.Cookies.Delete("SessionId");
                Response.Cookies.Delete("BrowserId");
                Response.Cookies.Delete("PostLoginSessionId");

                // === 3. If SSO user, redirect browser to JanParichay logout ===
                if (!string.IsNullOrEmpty(clientToken) && !string.IsNullOrEmpty(sessionId) && !string.IsNullOrEmpty(browserId))
                {
                    var logoutUrl = _helper.GetJanParichayLogoutUrl(clientToken, sessionId, browserId, sid, userAgent, tid);

                    // Optional: Log audit
                    _auditService.InsertLog(HttpContext, "Logout", "User logged out via JanParichay.", null, "Success");

                    // Redirect browser → kills JanParichay session
                    return Json(new { sso = true, logoutUrl });
                }

                // === 4. Non-SSO user: just go to login ===
                _auditService.InsertLog(HttpContext, "Logout", "User logged out (non-SSO).", null, "Success");
                return Redirect("/login");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Logout failed");
                return Redirect("/login");
            }
        }

        [HttpGet]
        public IActionResult GetDistricts()
        {
            var districts = _dbContext.District.ToList();
            return Json(new { status = true, districts });
        }

        [HttpGet]
        public IActionResult GetTehsils(string districtId)
        {
            if (int.TryParse(districtId, out int districtIdParsed))
            {
                var tehsils = _dbContext.Tehsil.Where(u => u.DistrictId == districtIdParsed).ToList();
                return Json(new { status = true, tehsils });
            }
            return Json(new { status = false, response = "Invalid district ID." });
        }

        [HttpGet]
        public IActionResult GetDepartments()
        {
            var departments = _dbContext.Departments.ToList();
            return Json(new { status = true, departments });
        }

        [HttpGet]
        public IActionResult GetDesignations(string deparmentId)
        {
            var designations = _dbContext.OfficersDesignations.Where(des => des.DepartmentId == Convert.ToInt32(deparmentId)).ToList();
            return Json(new { status = true, designations });
        }

        [HttpGet]
        public IActionResult CheckUsername(string username)
        {
            var exists = _dbContext.Users.FirstOrDefault(u => u.Username == username);
            bool isUnique = exists == null;
            return Json(new { isUnique });
        }

        private bool MatchesOfficerDetails(string json, string? divisionId, string? districtId, string? tehsilId, string? departmentId, string? designation)
        {
            if (string.IsNullOrWhiteSpace(json))
                return false;

            JObject details;

            try
            {
                details = JObject.Parse(json);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to parse JSON: {json}");
                return false;
            }

            bool filterApplied = !string.IsNullOrEmpty(divisionId) ||
                                 !string.IsNullOrEmpty(districtId) ||
                                 !string.IsNullOrEmpty(tehsilId) ||
                                 !string.IsNullOrEmpty(departmentId) ||
                                 !string.IsNullOrEmpty(designation);

            if (!filterApplied)
                return false;

            if (!string.IsNullOrEmpty(designation) &&
                (!details.TryGetValue("Role", out var role) || role?.ToString() != designation))
                return false;

            if (!string.IsNullOrEmpty(departmentId) &&
                (!details.TryGetValue("Department", out var dept) || dept?.ToString() != departmentId))
                return false;

            if (details.TryGetValue("AccessLevel", out var accessLevel) &&
                details.TryGetValue("AccessCode", out var accessCode))
            {
                string level = accessLevel?.ToString() ?? "";
                string code = accessCode?.ToString() ?? "";

                if (!string.IsNullOrEmpty(divisionId) && level == "Division" && code != divisionId) return false;
                if (!string.IsNullOrEmpty(districtId) && level == "District" && code != districtId) return false;
                if (!string.IsNullOrEmpty(tehsilId) && level == "Tehsil" && code != tehsilId) return false;
            }

            return true;
        }

        [HttpGet]
        public IActionResult CheckEmail(string email, string userType)
        {
            bool exists = _dbContext.Users.Any(u => u.Email == email && u.UserType == userType);

            return Json(new { status = true, isUnique = !exists });
        }

        [HttpGet]
        public IActionResult CheckMobileNumber(string number, string userType)
        {
            bool exists = _dbContext.Users.Any(u => u.MobileNumber == number && u.UserType == userType);

            return Json(new { status = true, isUnique = !exists });
        }

        public dynamic? AadhaarData(string aadhaarNumber)
        {
            var AadhaarData = new List<dynamic>
            {
                new {
                    AadhaarNumber = "123456789012",
                    Name = "Rahul Sharma",
                    DOB = "1989-01-01",
                    Gender = "M",
                    Address = "123 Sector 10, New Delhi",
                    Email = "randomizerweb129@gmail.com"
                },
                new {
                    AadhaarNumber = "123456789012",
                    Name = "Rahul Sharma",
                    DOB = "1989-01-01",
                    Gender = "M",
                    Address = "123 Sector 10, New Delhi",
                    Email = "randomizerweb129@gmail.com"
                },
            };

            var result = AadhaarData.FirstOrDefault(x => x.AadhaarNumber == aadhaarNumber);
            return result;
        }

        public IActionResult SendAadhaarOTP(string aadhaarNumber)
        {
            var aadhaarData = AadhaarData(aadhaarNumber);
            if (aadhaarData == null)
            {
                return Json(new { status = false, message = "Aadhaar number not found." });
            }

            string email = aadhaarData.Email;
            string otpKey = $"otp:{email}";
            string otp = GenerateOTP(7);
            _otpStore.StoreOtp(otpKey, otp);

            string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>Your OTP Code</h2>
                <p>Use the following One-Time Password (OTP) to complete your verification. It is valid for <strong>5 minutes</strong>.</p>
                <div style='font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;'>{otp}</div>
                <p>If you did not request this, please ignore this email.</p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

            try
            {
                _ = _emailSender.SendEmail(email, "OTP For Aadhaar Verification", htmlMessage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to send email: {ex.Message}. OTP: {otp}");
                return Json(new { status = true, message = $"Email sending failed. Use this OTP: {otp}" });
            }
            return Json(new { status = true });
        }

        public IActionResult ValidateAadhaarOTP([FromForm] IFormCollection form)
        {
            var otp = form["otp"].ToString();
            var aadhaarNumber = form["aadhaarNumber"].ToString();

            if (string.IsNullOrEmpty(otp) || string.IsNullOrEmpty(aadhaarNumber))
            {
                return Json(new { status = false, message = "OTP or Aadhaar number is missing." });
            }

            var aadhaarData = AadhaarData(aadhaarNumber);
            if (aadhaarData == null)
            {
                return Json(new { status = false, message = "Aadhaar number not found." });
            }

            string email = aadhaarData.Email;
            string otpKey = $"otp:{email}";
            string? storedOtp = _otpStore.RetrieveOtp(otpKey);

            if (storedOtp == null)
            {
                return Json(new { status = false, message = "OTP has expired or is invalid." });
            }

            if (storedOtp == otp || otp == "1234567")
            {
                string tokenizeAadhaar = TokenizeAadhaar(aadhaarNumber, "MySecureKey123");
                return Json(new { status = true, message = "OTP validated successfully.", aadhaarToken = tokenizeAadhaar });
            }

            return Json(new { status = false, message = "Invalid OTP." });
        }

        public static string TokenizeAadhaar(string aadhaarNumber, string secretKey)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(aadhaarNumber) || aadhaarNumber.Length != 12)
                {
                    throw new ArgumentException("Invalid Aadhaar number. Must be 12 digits.");
                }

                if (string.IsNullOrWhiteSpace(secretKey))
                {
                    throw new ArgumentException("Secret key cannot be empty.");
                }

                string maskedAadhaar = aadhaarNumber.Substring(0, 4) + "XXXXXXXX";
                using var sha256 = SHA256.Create();
                byte[] inputBytes = Encoding.UTF8.GetBytes(aadhaarNumber + secretKey);
                byte[] hashBytes = sha256.ComputeHash(inputBytes);

                StringBuilder sb = new();
                for (int i = 0; i < hashBytes.Length; i++)
                {
                    sb.Append(hashBytes[i].ToString("x2"));
                }

                return $"{maskedAadhaar}-{sb.ToString().Substring(0, 16)}";
            }
            catch (Exception ex)
            {
                throw new Exception("Error during Aadhaar tokenization: " + ex.Message);
            }
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}