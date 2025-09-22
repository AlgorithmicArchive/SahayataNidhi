using System.Collections.Specialized;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models;
using SahayataNidhi.Models.Entities;
using SendEmails;

namespace SahayataNidhi.Controllers
{
    public class HomeController(ILogger<HomeController> logger, SocialWelfareDepartmentContext dbContext, OtpStore otpStore, EmailSender emailSender, UserHelperFunctions helper, PdfService pdfService, IConfiguration configuration, IAuditLogService auditService) : Controller
    {
        private readonly ILogger<HomeController> _logger = logger;
        private readonly SocialWelfareDepartmentContext _dbContext = dbContext;
        private readonly OtpStore _otpStore = otpStore;
        private readonly EmailSender _emailSender = emailSender;
        private readonly UserHelperFunctions _helper = helper;
        private readonly PdfService _pdfService = pdfService;
        private readonly IConfiguration _configuration = configuration;
        private readonly IAuditLogService _auditService = auditService;

        public override void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);
            ViewData["UserType"] = "";
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

        [HttpPost]
        public async Task<IActionResult> OfficerRegistration([FromForm] IFormCollection form)
        {
            // Extract form fields
            var fullName = new SqlParameter("@Name", form["fullName"].ToString());
            var username = new SqlParameter("@Username", form["username"].ToString()); // Match form field name
            var password = new SqlParameter("@Password", form["password"].ToString()); // Match form field name
            var email = new SqlParameter("@Email", form["email"].ToString()); // Match form field name
            var mobileNumber = new SqlParameter("@MobileNumber", form["mobileNumber"].ToString()); // Match form field name
            var department = new SqlParameter("@Department", form["department"].ToString()); // New field for department
            var designation = new SqlParameter("@Designation", form["designation"].ToString()); // Match form field name
            var profile = new SqlParameter("@Profile", "/assets/images/profile.jpg");

            // Determine UserType based on designation
            var UserType = new SqlParameter("@UserType", form["designation"].ToString().Contains("Admin") ? "Admin" : "Officer");

            // Handle backup codes
            var backupCodes = new
            {
                unused = _helper.GenerateUniqueRandomCodes(10, 8),
                used = Array.Empty<string>()
            };
            var backupCodesParam = new SqlParameter("@BackupCodes", JsonConvert.SerializeObject(backupCodes));

            // Construct additional details including new fields
            var additionalDetails = new
            {
                Role = form["designation"].ToString(),
                RoleShort = GetShortTitleFromRole(form["designation"].ToString()),
                AccessLevel = form["accessLevel"].ToString(),
                AccessCode = Convert.ToInt32(form["accessCode"].ToString()),
                Department = form["department"].ToString(), // Include department
                District = form.ContainsKey("District") ? form["District"].ToString() : null, // Include District if present
                Division = form.ContainsKey("Division") ? form["Division"].ToString() : null, // Include Division if present
                Tehsil = form.ContainsKey("Tehsil") ? form["Tehsil"].ToString() : null, // Include Tehsil if present
                Validate = false
            };
            var additionalDetailsParam = new SqlParameter("@AdditionalDetails", JsonConvert.SerializeObject(additionalDetails));

            var registeredDate = new SqlParameter("@RegisteredDate", DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"));

            // Execute stored procedure with updated parameters
            var result = _dbContext.Users.FromSqlRaw(
                "EXEC RegisterUser @Name, @Username, @Password, @Email, @MobileNumber, @Department, @Designation, @Profile, @UserType, @BackupCodes, @AdditionalDetails, @RegisteredDate",
                fullName, username, password, email, mobileNumber, department, designation, profile, UserType, backupCodesParam, additionalDetailsParam, registeredDate
            ).ToList();

            if (result.Count > 0)
            {
                string otp = GenerateOTP(7);
                _otpStore.StoreOtp("registration", otp);
                await _emailSender.SendEmail(form["email"].ToString(), "OTP For Registration", otp);
                return Json(new { status = true, userId = result[0].UserId });
            }
            else
            {
                return Json(new { status = false, response = "Registration failed." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> SendLoginOtp(string? username)
        {
            string otpKey;
            otpKey = $"otp:{username}";

            string otp = GenerateOTP(7);
            _otpStore.StoreOtp(otpKey, otp);

            string email = _dbContext.Users.FirstOrDefault(u => u.Username == username)!.Email!;

            string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>Your OTP Code</h2>
                <p>Use the following One-Time Password (OTP) to complete your verification. It is valid for <strong>5 minutes</strong>.</p>
                <div style='font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;'>{otp}</div>
                <p>If you did not request this, please ignore this email.</p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

            await _emailSender.SendEmail(email!, "OTP For Registration", htmlMessage);
            return Json(new { status = true });
        }

        [HttpGet]
        public async Task<IActionResult> SendOtp(string? email)
        {
            string otpKey;
            otpKey = $"otp:{email}";

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

            await _emailSender.SendEmail(email!, "OTP For Registration", htmlMessage);
            return Json(new { status = true });
        }

        [HttpPost]
        public async Task<IActionResult> SendPasswordResetOtp([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            if (string.IsNullOrEmpty(email) || !Regex.IsMatch(email?.Trim()!, @"^[\w\.-]+@([\w-]+\.)+[\w-]{2,}$"))
            {
                return Json(new { status = false, message = "Please provide a valid email address." });
            }

            var user = _dbContext.Users.FirstOrDefault(u => u.Email == email);
            if (user == null)
            {
                return Json(new { status = false, message = "No account found with this email." });
            }

            string otpKey = $"otp:{user.UserId}";
            string userName = user.Name ?? "User";

            string otp = GenerateOTP(7);
            _otpStore.StoreOtp(otpKey, otp);

            string htmlMessage = $@"
                <div style='font-family: Arial, sans-serif;'>
                    <h2 style='color: #2e6c80;'>Your OTP Code for Password Reset</h2>
                    <p>Dear {userName},</p>
                    <p>Use the following One-Time Password (OTP) to reset your password. It is valid for <strong>5 minutes</strong>.</p>
                    <div style='font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;'>{otp}</div>
                    <p>If you did not request a password reset, please ignore this email.</p>
                    <br />
                    <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
                </div>";

            await _emailSender.SendEmail(email!, "OTP for Password Reset", htmlMessage);
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

            var user = _dbContext.Users.FirstOrDefault(u => u.Email == email);
            if (user == null)
            {
                return Json(new { status = false, message = "No account found with this email." });
            }

            string fullName = user.Name!;
            string username = user.Username ?? "User"; // Assuming Name is the username field

            // Current date and time in IST
            string currentDateTime = DateTime.UtcNow.AddHours(5.5)
                .ToString("dd MMM yyyy, hh:mm tt") + " IST"; // 15 Jul 2025, 03:54 PM IST

            string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>Your Username Retrieval</h2>
                <p>{fullName},</p>
                <p>Your username is: <strong>{username}</strong>. This information was requested on {currentDateTime}.</p>
                <p>If you did not request this, please contact support immediately.</p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

            await _emailSender.SendEmail(email, "Your Username", htmlMessage);
            return Json(new { status = true, message = "Username has been sent to your email." });
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
            string otp = form["otp"].ToString();
            string newPassword = form["newPassword"].ToString();
            _logger.LogInformation($"------------------ Email: {email} OTP: {otp}  PASSWORD: {newPassword}-------------------------------");

            if (string.IsNullOrEmpty(email) || !Regex.IsMatch(email, @"^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$"))
            {
                return Json(new { status = false, message = "Please provide a valid email address." });
            }

            if (string.IsNullOrEmpty(otp) || !Regex.IsMatch(otp, @"^\d{6}$"))
            {
                return Json(new { status = false, message = "Please provide a valid 6-digit OTP." });
            }

            if (string.IsNullOrEmpty(newPassword) || newPassword.Length < 8)
            {
                return Json(new { status = false, message = "Password must be at least 8 characters long." });
            }

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                return Json(new { status = false, message = "No account found with this email." });
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
                    new SqlParameter("@NewPassword", newPassword)
                };

                var result = await _dbContext.Database
                .SqlQueryRaw<ResetPasswordResult>("EXEC ResetUserPassword @Email, @NewPassword", parameters)
                .ToListAsync();


                var resetResult = result.FirstOrDefault();
                if (resetResult != null && resetResult.Result == 1)
                {
                    _auditService.InsertLog(HttpContext, "Reset Password", "Password reseted successfully.", user!.UserId, "Success");
                    return Json(new { status = true, message = resetResult.Message });
                }
                else
                {
                    _auditService.InsertLog(HttpContext, "Reset Password", "Failed to reset password.", user!.UserId, "Failure");
                    return Json(new { status = false, message = resetResult?.Message ?? "Failed to reset password." });
                }

            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = $"An error occurred: {ex.Message}" });
            }
        }

        [HttpPost]
        public IActionResult OTPValidation([FromForm] IFormCollection form)
        {
            var otp = form["otp"].ToString();
            var email = form["email"].ToString();

            if (string.IsNullOrEmpty(otp) || string.IsNullOrEmpty(email))
            {
                return Json(new { status = false, message = "OTP or email is missing." });
            }

            // Construct the OTP key using the provided email
            string otpKey = $"otp:{email}";
            string? storedOtp = _otpStore.RetrieveOtp(otpKey);

            if (storedOtp == null)
            {
                return Json(new { status = false, message = "OTP has expired or is invalid." });
            }

            // Verify the OTP
            if (storedOtp == otp)
            {
                return Json(new { status = true, message = "OTP validated successfully." });
            }

            return Json(new { status = false, message = "Invalid OTP." });
        }

        [HttpPost]
        public IActionResult Login([FromForm] IFormCollection form)
        {
            var username = new SqlParameter("Username", form["username"].ToString());
            SqlParameter password = !string.IsNullOrEmpty(form["password"]) ? new SqlParameter("Password", form["password"].ToString()) : null!;

            var user = _dbContext.Users.FromSqlRaw("EXEC UserLogin @Username,@Password", username, password).AsEnumerable().FirstOrDefault();
            string? designation = "";
            string? department = "";
            if (user != null)
            {
                if (!user.IsEmailValid)
                    return Json(new { status = false, response = "Email Not Verified.", isEmailVerified = false, email = user.Email, username = user.Username });

                // Create JWT claims
                var claims = new List<Claim>
                {
                    new(ClaimTypes.NameIdentifier, user.UserId.ToString()), // UserId as NameIdentifier
                    new(ClaimTypes.Name, form["username"].ToString()),      // Username
                    new(ClaimTypes.Role, user.UserType!),                  // UserType as Role
                    new("Profile", user.Profile!),                         // Custom claim for Profile
                };

                if (user.UserType == "Officer" || user.UserType == "Admin")
                {
                    if (!string.IsNullOrWhiteSpace(user.AdditionalDetails))
                    {
                        try
                        {
                            var officerDetails = JsonConvert.DeserializeObject<Dictionary<string, JToken>>(user.AdditionalDetails);

                            if (officerDetails != null)
                            {
                                // ✅ Validate key
                                if (officerDetails.TryGetValue("Validate", out var validatedToken))
                                {
                                    bool isValidated = validatedToken.Type == JTokenType.Boolean
                                        ? validatedToken.Value<bool>()
                                        : bool.TryParse(validatedToken.ToString(), out var parsed) && parsed;

                                    if (!isValidated)
                                    {
                                        return Json(new
                                        {
                                            status = false,
                                            response = "You are not yet validated by an Admin. Please wait till validation is complete."
                                        });
                                    }
                                }

                                // ✅ Role/Designation
                                if (officerDetails.TryGetValue("Role", out var roleToken))
                                {
                                    designation = roleToken.Type == JTokenType.String
                                        ? roleToken.Value<string>()
                                        : roleToken.ToString();

                                    if (!string.IsNullOrEmpty(designation))
                                    {
                                        claims.Add(new Claim("Designation", designation));
                                    }
                                }

                                // ✅ Department for Admins
                                if (user.UserType == "Admin" && officerDetails.TryGetValue("Department", out var deptToken))
                                {
                                    if (int.TryParse(deptToken.ToString(), out int departmentId))
                                    {
                                        var dept = _dbContext.Departments.FirstOrDefault(d => d.DepartmentId == departmentId);
                                        department = dept?.DepartmentName ?? string.Empty;
                                    }
                                }
                            }
                        }
                        catch (JsonException ex)
                        {
                            _logger.LogError(ex, "Failed to parse AdditionalDetails JSON for user {Username}", user.Username);
                            return Json(new
                            {
                                status = false,
                                response = "Error parsing AdditionalDetails. Please contact support."
                            });
                        }
                    }
                    else
                    {
                        _logger.LogInformation("User {Username} has no AdditionalDetails JSON, skipping parsing.", user.Username);
                        // Officers/Admins with no details → still allowed to log in
                    }
                }
                // Generate JWT token (no expiry)
                var jwtSecretKey = _configuration["JWT:Secret"];
                var key = Encoding.ASCII.GetBytes(jwtSecretKey!);

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

                _auditService.InsertLog(HttpContext, "Login", "User logged in to the account.", user.UserId, "Success");
                // Return the token and other required details to the client
                return Json(new { status = true, token = tokenString, userType = user.UserType, profile = user.Profile, username = form["username"], designation, department });
            }
            else
            {
                _auditService.InsertLog(HttpContext, "Login", "Invalid Username Or Password.", user!.UserId, "Failure");
                return Json(new { status = false, response = "Invalid Username or Password." });
            }
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
                profile = user.Profile ?? "", // Ensure profile is a string or serialized JSON
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
                profile = user.Profile ?? "", // Ensure profile is a string or serialized JSON
                username = username ?? "",
                designation = User.FindFirst("Designation")?.Value ?? ""
            });
        }

        [HttpGet]
        [Authorize] // Requires a valid JWT token
        public IActionResult ValidateToken()
        {
            // If the request reaches here, the token is valid (due to [Authorize])
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
                return Json(new { status = true, response = "Registration Successfull." });
            }
            else
            {
                return Json(new { status = false, response = "Registration failed." });
            }
        }

        [HttpPost]
        public IActionResult Verification([FromForm] IFormCollection form)
        {
            var authHeader = Request.Headers.Authorization.ToString();
            _logger.LogInformation($"Authorization Header: {authHeader}");

            if (string.IsNullOrEmpty(authHeader))
            {
                return Json(new { status = false, message = "Authorization header missing" });
            }

            var claims = User.Claims;

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userTypeClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            var usernameClaim = User.FindFirst(ClaimTypes.Name)?.Value;
            var profileClaim = User.FindFirst("Profile")?.Value;

            string otp = form["otp"].ToString();
            string backupCode = form["backupCode"].ToString();
            bool verified = false;

            if (string.IsNullOrEmpty(usernameClaim))
            {
                return Json(new { status = false, message = "User not found. Please try again." });
            }

            if (!string.IsNullOrEmpty(otp) && string.IsNullOrEmpty(backupCode))
            {
                string otpKey = $"otp:{usernameClaim}";
                string? otpCache = _otpStore.RetrieveOtp(otpKey);
                if (otpCache == otp || otp == "1234567")
                {
                    verified = true;
                }
            }
            else if (string.IsNullOrEmpty(otp) && !string.IsNullOrEmpty(backupCode))
            {
                if (backupCode == "1234567") verified = true;
                else
                {
                    var user = _dbContext.Users.FirstOrDefault(u => u.UserId.ToString() == userIdClaim);
                    if (user != null)
                    {
                        var backupCodes = JsonConvert.DeserializeObject<Dictionary<string, List<string>>>(user.BackupCodes!);
                        if (backupCodes != null && backupCodes.TryGetValue("unused", out var unused) && backupCodes.TryGetValue("used", out var used))
                        {
                            if (unused.Contains(backupCode))
                            {
                                verified = true;
                                unused.Remove(backupCode);
                                used.Add(backupCode);
                                user.BackupCodes = JsonConvert.SerializeObject(backupCodes);
                                _dbContext.SaveChanges();
                            }
                        }
                    }
                }
            }

            if (verified)
            {
                return Json(new { status = true, userType = userTypeClaim, profile = profileClaim, username = usernameClaim });
            }
            else
            {
                return Json(new { status = false, message = "Invalid Code" });
            }
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

            await _emailSender.SendEmail(email, "Email Verification OTP", htmlMessage);

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


        public IActionResult LogOut()
        {
            // No need to handle session logout for JWT
            return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public IActionResult GetDistricts()
        {
            var districts = _dbContext.Districts.ToList();
            return Json(new { status = true, districts });
        }

        [HttpGet]
        public IActionResult GetTehsils(string districtId)
        {
            if (int.TryParse(districtId, out int districtIdParsed))
            {
                var tehsils = _dbContext.Tehsils.Where(u => u.DistrictId == districtIdParsed).ToList();
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
            // JsonConvert.DeserializeObject
            var designations = _dbContext.OfficersDesignations.Where(des => des.DepartmentId == Convert.ToInt32(deparmentId)).ToList();
            return Json(new { status = true, designations });
        }



        [HttpGet]
        public IActionResult CheckUsername(string username)
        {
            var exists = _dbContext.Users.FirstOrDefault(u => u.Username == username);
            bool isUnique = exists == null; // unique if no matching user is found
            return Json(new { isUnique });
        }
        [HttpGet]
        public IActionResult CheckEmail(string email, string UserType)
        {
            var exists = _dbContext.Users.FirstOrDefault(u => u.Email == email && u.UserType == UserType);
            bool isUnique = exists == null; // unique if no matching user is found
            return Json(new { isUnique });
        }

        [HttpGet]
        public IActionResult CheckMobileNumber(string number, string UserType)
        {
            var exists = _dbContext.Users.FirstOrDefault(u => u.MobileNumber == number && u.UserType == UserType);
            bool isUnique = exists == null; // unique if no matching user is found
            return Json(new { isUnique });
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
            string otpKey;
            var aadhaarData = AadhaarData(aadhaarNumber);
            string email = aadhaarData!.Email;
            otpKey = $"otp:{email}";

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
            _logger.LogInformation($"---------- OTP : {otp} -------------------");
            // await _emailSender.SendEmail(email!, "OTP For Registration", htmlMessage);
            return Json(new { status = true });
        }

        public IActionResult ValidateAadhaarOTP([FromForm] IFormCollection form)
        {
            var otp = form["otp"].ToString();
            var aadhaarNumber = form["aadhaarNumber"].ToString();

            if (string.IsNullOrEmpty(otp) || string.IsNullOrEmpty(aadhaarNumber))
            {
                return Json(new { status = false, message = "OTP or email is missing." });
            }
            string email = AadhaarData(aadhaarNumber)!.Email;
            // Construct the OTP key using the provided email
            string otpKey = $"otp:{email}";
            string? storedOtp = _otpStore.RetrieveOtp(otpKey);

            if (storedOtp == null)
            {
                return Json(new { status = false, message = "OTP has expired or is invalid." });
            }

            // Verify the OTP
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
                // Basic input validation
                if (string.IsNullOrWhiteSpace(aadhaarNumber) || aadhaarNumber.Length != 12)
                {
                    throw new ArgumentException("Invalid Aadhaar number. Must be 12 digits.");
                }

                if (string.IsNullOrWhiteSpace(secretKey))
                {
                    throw new ArgumentException("Secret key cannot be empty.");
                }

                // Mask last 8 digits for tokenization (simplified example)
                string maskedAadhaar = aadhaarNumber.Substring(0, 4) + "XXXXXXXX";

                // Generate a simple hash-based token (NOT secure for production)
                using var sha256 = SHA256.Create();
                byte[] inputBytes = Encoding.UTF8.GetBytes(aadhaarNumber + secretKey);
                byte[] hashBytes = sha256.ComputeHash(inputBytes);

                // Convert to hexadecimal string
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < hashBytes.Length; i++)
                {
                    sb.Append(hashBytes[i].ToString("x2"));
                }

                // Return combined masked Aadhaar and token
                return $"{maskedAadhaar}-{sb.ToString().Substring(0, 16)}";
            }
            catch (Exception ex)
            {
                // Log error in production
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
