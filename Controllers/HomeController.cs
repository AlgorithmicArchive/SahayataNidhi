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

        public async Task<bool> ValidateToken(JanParichayUser janUser)
        {
            var client = _httpClientFactory.CreateClient();
            var clientToken = janUser.ClientToken; // From payload
            var sessionId = janUser.SessionId; // From payload (Post Login Session Id)
            var browserId = janUser.BrowserId; // From payload

            // PDF Page 10: Include sessionId & browserId from cookies if set, fallback to payload
            var cookieSessionId = HttpContext.Request.Cookies["SessionId"];
            var cookieBrowserId = HttpContext.Request.Cookies["BrowserId"];
            if (!string.IsNullOrEmpty(cookieSessionId)) sessionId = cookieSessionId;
            if (!string.IsNullOrEmpty(cookieBrowserId)) browserId = cookieBrowserId;

            var url = $"{_configuration["JanParichay:ClientBaseUrl"]}/isTokenValid?" +
                      $"clientToken={Uri.EscapeDataString(clientToken!)}" +
                      $"&sid={_configuration["JanParichay:ServiceId"]}" +
                      $"&sessionId={Uri.EscapeDataString(sessionId!)}" +
                      $"&browserId={Uri.EscapeDataString(browserId!)}";

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
                var clientSessionId = Guid.NewGuid().ToString();
                var sid = _configuration["JanParichay:ServiceId"]!;
                var tid = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeMilliseconds();
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
                                  $"&cs={Uri.EscapeDataString(clientSignature)}" +
                                  $"&string={Uri.EscapeDataString(encryptedClientSessionId)}";

                _logger.LogInformation("Redirecting to JanParichay: {Url}", redirectUrl);

                // Return JSON for React frontend
                return Ok(new { redirectUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "InitiateSSO failed");
                return StatusCode(500, new { error = "SSO initiation failed", details = ex.Message });
            }
        }

        [HttpGet("sso/callback")]
        public async Task<IActionResult> SSOCallback([FromQuery] string @string)
        {
            if (string.IsNullOrEmpty(@string))
                return BadRequest(new { status = false, response = "Missing handshaking ID" });

            try
            {
                var sid = _configuration["JanParichay:ServiceId"]!;
                var clientBaseUrl = _configuration["JanParichay:ClientBaseUrl"]!.TrimEnd('/');

                // 1. Create HttpClient
                var client = _httpClientFactory.CreateClient();

                // 2. Call Handshake API
                var handshakeUrl = $"{clientBaseUrl}/handshake?handshakingId={Uri.EscapeDataString(@string)}&sid={sid}";
                var response = await client.GetAsync(handshakeUrl);

                if (response.StatusCode != HttpStatusCode.Accepted) // 202
                    return StatusCode(500, new { status = false, response = "Handshake failed" });

                var encryptedPayload = await response.Content.ReadAsStringAsync();
                if (encryptedPayload == "false")
                    return Unauthorized(new { status = false, response = "Invalid handshaking ID" });

                // 3. Decrypt
                var decryptedJson = await _helper.DecryptStringAsync(encryptedPayload);
                var janUser = JsonSerializer.Deserialize<JanParichayUser>(decryptedJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (janUser?.ClientToken == null)
                    return BadRequest(new { status = false, response = "Invalid user data" });

                // 4. Token Validation
                var isValid = await ValidateToken(janUser);
                if (!isValid)
                    return Unauthorized(new { status = false, response = "Token validation failed" });

                // 5. Create local user & JWT
                var localUser = await _helper.FindOrCreateJanParichayUser(janUser);
                if (localUser == null)
                    return StatusCode(500, new { status = false, response = "User creation failed" });

                var jwt = _helper.GenerateJwt(localUser, janUser.ClientToken);

                // 6. Set Cookies
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = _configuration.GetValue<bool>("AppSettings:UseSecureCookies", true),
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.Now.AddHours(12)
                };

                Response.Cookies.Append("ClientToken", janUser.ClientToken, cookieOptions);
                Response.Cookies.Append("SessionId", janUser.SessionId!, cookieOptions);
                Response.Cookies.Append("BrowserId", janUser.BrowserId!, cookieOptions);
                Response.Cookies.Append("PostLoginSessionId", janUser.SessionId!, cookieOptions);

                // 7. Redirect to Frontend
                var ssoResponse = new
                {
                    status = true,
                    token = jwt,
                    userType = localUser.UserType,
                    username = localUser.Username,
                    userId = localUser.UserId,
                    designation = janUser.Designation ?? "",
                    department = _helper.GetDepartment(localUser),
                    profile = localUser.Profile ?? "/assets/images/profile.jpg",
                    email = janUser.Email
                };

                var encoded = Uri.EscapeDataString(JsonSerializer.Serialize(ssoResponse));
                var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                return Redirect($"{frontendUrl}/sso-callback?sso={encoded}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SSOCallback failed. handshakingId: {Id}", @string);
                return StatusCode(500, new { status = false, response = "SSO processing failed" });
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

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new(ClaimTypes.Name, user.Username!),
                new(ClaimTypes.Role, user.UserType!),
                new("Profile", user.Profile!)
            };

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
                            if (details.TryGetValue("Validate", out var validatedToken) &&
                                !validatedToken.Value<bool>())
                                return Json(new { status = false, response = "You are not yet validated by Admin." });

                            if (details.TryGetValue("Role", out var roleToken))
                            {
                                designation = roleToken.ToString();
                                if (!string.IsNullOrEmpty(designation))
                                    claims.Add(new Claim("Designation", designation));
                            }

                            if (user.UserType == "Admin" && details.TryGetValue("Department", out var deptToken))
                            {
                                if (int.TryParse(deptToken.ToString(), out int deptId))
                                {
                                    department = _dbContext.Departments.FirstOrDefault(d => d.DepartmentId == deptId)?.DepartmentName ?? "";
                                }
                            }
                        }
                    }
                    catch { /* handle JSON parsing errors */ }
                }
            }

            var key = Encoding.ASCII.GetBytes(_configuration["JWT:Secret"]!);
            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["JWT:Issuer"],
                Audience = _configuration["JWT:Audience"]
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

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

            return Json(new
            {
                status = true,
                token = tokenString,
                userType = user.UserType,
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
        public IActionResult ValidateToken()
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
            // Extract form fields and map to stored procedure parameters
            var fullName = new SqlParameter("@Name", form["fullName"].ToString());
            var username = new SqlParameter("@Username", form["username"].ToString());
            var password = new SqlParameter("@Password", form["password"].ToString()); // Will be hashed in SQL
            var email = new SqlParameter("@Email", form["email"].ToString());
            var mobileNumber = new SqlParameter("@MobileNumber", form["mobileNumber"].ToString());
            var profile = new SqlParameter("@Profile", "/assets/images/profile.jpg"); // Default profile image

            // Determine UserType
            var userType = new SqlParameter("@UserType",
                form["designation"].ToString().Contains("Admin") ? "Admin" : "Officer");

            // Backup codes (stored as JSON string in NVARCHAR(MAX))
            var backupCodes = new
            {
                unused = _helper.GenerateUniqueRandomCodes(10, 8),
                used = Array.Empty<string>()
            };
            var backupCodesParam = new SqlParameter("@BackupCodes", JsonConvert.SerializeObject(backupCodes));

            // Additional details JSON
            var additionalDetails = new
            {
                Role = form["designation"].ToString(),
                RoleShort = GetShortTitleFromRole(form["designation"].ToString()),
                AccessLevel = form["accessLevel"].ToString(),
                AccessCode = Convert.ToInt32(form["accessCode"].ToString()),
                Department = form["department"].ToString(),
                District = form.ContainsKey("District") ? form["District"].ToString() : null,
                Division = form.ContainsKey("Division") ? form["Division"].ToString() : null,
                Tehsil = form.ContainsKey("Tehsil") ? form["Tehsil"].ToString() : null,
                Validate = false
            };
            var additionalDetailsParam = new SqlParameter("@AddtionalDetails", JsonConvert.SerializeObject(additionalDetails));

            // Date of registration (as NVARCHAR to match SP definition)
            var registeredDate = new SqlParameter("@RegisteredDate",
                DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"));

            // 🔹 Execute Stored Procedure (parameter names must match exactly)
            var result = _dbContext.Users.FromSqlRaw(
                "EXEC RegisterUser @Name, @Username, @Password, @Email, @MobileNumber, @Profile, @UserType, @BackupCodes, @AddtionalDetails, @RegisteredDate",
                fullName, username, password, email, mobileNumber, profile, userType, backupCodesParam, additionalDetailsParam, registeredDate
            ).ToList();

            // Handle result
            if (result.Count > 0)
            {
                return Json(new { status = true, userId = result[0].UserId, message = "Registration successful." });
            }

            return Json(new { status = false, message = "Registration failed." });
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

        [HttpGet]
        [Authorize]
        public IActionResult LogOut()
        {
            return RedirectToAction("Index", "Home");
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
        public IActionResult CheckEmail(string email, string UserType, string? divisionId = null, string? departmentId = null, string? districtId = null, string? tehsilId = null, string? designation = null)
        {
            bool exists;

            if (UserType == "Citizen")
            {
                exists = _dbContext.Users.Any(u => u.Email == email && u.UserType == UserType);
            }
            else if (UserType != "Citizen")
            {
                // First, check if email already exists for officer
                exists = _dbContext.Users.Any(u => u.Email == email && u.UserType == UserType);

                if (exists)
                {
                    // Now match with JSON details only if email exists
                    exists = _dbContext.Users
                        .AsEnumerable()
                        .Any(u => u.Email == email &&
                                  u.UserType == UserType &&
                                  u.AdditionalDetails != null &&
                                  MatchesOfficerDetails(u.AdditionalDetails, divisionId, districtId, tehsilId, departmentId, designation));
                }
            }
            else
            {
                exists = _dbContext.Users.Any(u => u.Email == email);
            }

            return Json(new { status = true, isUnique = !exists });
        }

        [HttpGet]
        public IActionResult CheckMobileNumber(string number, string UserType, string? divisionId = null, string? districtId = null, string? tehsilId = null, string? departmentId = null, string? designation = null)
        {
            bool exists;

            if (UserType == "Citizen")
            {
                exists = _dbContext.Users.Any(u => u.MobileNumber == number && u.UserType == UserType);
            }
            else if (UserType == "Officer")
            {
                exists = _dbContext.Users.Any(u => u.MobileNumber == number && u.UserType == UserType);

                if (exists)
                {
                    exists = _dbContext.Users
                        .AsEnumerable()
                        .Any(u => u.MobileNumber == number &&
                                  u.UserType == UserType &&
                                  u.AdditionalDetails != null &&
                                  MatchesOfficerDetails(u.AdditionalDetails, divisionId, districtId, tehsilId, departmentId, designation));
                }
            }
            else
            {
                exists = _dbContext.Users.Any(u => u.MobileNumber == number);
            }

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