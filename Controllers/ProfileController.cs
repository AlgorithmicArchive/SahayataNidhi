using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers.Profile
{
    [Authorize(Roles = "Citizen,Officer,Admin")]
    public class ProfileController(SocialWelfareDepartmentContext dbcontext, ILogger<ProfileController> logger, UserHelperFunctions helper, IWebHostEnvironment webHostEnvironment, IAuditLogService auditService) : Controller
    {
        private readonly SocialWelfareDepartmentContext _dbcontext = dbcontext;
        private readonly ILogger<ProfileController> _logger = logger;
        private readonly UserHelperFunctions _helper = helper;
        private readonly IWebHostEnvironment _webHostEnvironment = webHostEnvironment;
        private readonly IAuditLogService _auditService = auditService;

        public override void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            string? userType = User.FindFirst(ClaimTypes.Role)?.Value;
            var user = _dbcontext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
            string Profile = user?.Profile ?? "/assets/images/profile.jpg";
            ViewData["UserType"] = userType;
            ViewData["UserName"] = user?.Username;
            ViewData["Profile"] = Profile;
        }

        [HttpGet]
        public IActionResult Index()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            string? userType = User.FindFirst(ClaimTypes.Role)?.Value;

            if (userId != null && !string.IsNullOrEmpty(userType))
            {
                var userDetails = _dbcontext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
                return View(userDetails);
            }
            return RedirectToAction("Error", "Home");
        }

        [HttpGet]
        public IActionResult GetUserDetails()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                _logger.LogWarning("User ID not found in claims.");
                return Json(new { isValid = false, errorMessage = "User ID not found." });
            }

            var userDetails = _dbcontext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
            if (userDetails == null)
            {
                _logger.LogWarning($"User not found for ID: {userId}");
                return Json(new { isValid = false, errorMessage = "User not found." });
            }

            try
            {
                // Get ProofOfAge from AdditionalDetails
                var ageProof = string.IsNullOrEmpty(userDetails.AdditionalDetails)
                    ? ""
                    : JObject.Parse(userDetails.AdditionalDetails)["ProofOfAge"]?.ToString() ?? "";

                var details = new
                {
                    isValid = true,
                    userDetails.Name,
                    userDetails.Username,
                    userDetails.Email,
                    userDetails.MobileNumber,
                    userDetails.Profile,
                    userDetails.BackupCodes,
                    ageProof
                };

                return Json(details);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error fetching user details: {ex.Message}");
                return Json(new { isValid = false, errorMessage = "Failed to fetch user details: " + ex.Message });
            }
        }


        [HttpGet]
        public IActionResult GenerateBackupCodes()
        {
            var userId = Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            string TableName = "Users";

            try
            {
                var unused = _helper.GenerateUniqueRandomCodes(10, 8);
                var backupCodes = new
                {
                    unused,
                    used = Array.Empty<string>(),
                };

                var backupCodesParam = new SqlParameter("@ColumnValue", JsonConvert.SerializeObject(backupCodes));

                _dbcontext.Database.ExecuteSqlRaw(
                    "EXEC UpdateCitizenDetail @ColumnName, @ColumnValue, @TableName, @UserId",
                    new SqlParameter("@ColumnName", "BackupCodes"),
                    backupCodesParam,
                    new SqlParameter("@TableName", TableName),
                    new SqlParameter("@UserId", userId)
                );

                return Json(new { status = true, url = "/settings" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error generating backup codes: {ex.Message}");
                return Json(new { status = false, errorMessage = "Failed to generate backup codes." });
            }
        }

        [HttpGet]
        public IActionResult Settings()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            string? userType = HttpContext.Session.GetString("UserType");

            if (userId != null && !string.IsNullOrEmpty(userType))
            {
                var userDetails = _dbcontext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
                if (userType == "Admin") ViewData["Layout"] = "_AdminLayout";

                if (userDetails != null) return View(userDetails);
            }
            return RedirectToAction("Error", "Home");
        }

        [HttpPost]
        public async Task<IActionResult> UpdateUserDetails([FromForm] IFormCollection form)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var user = await _dbcontext.Users.FirstOrDefaultAsync(u => u.UserId.ToString() == userId);

            if (user == null)
            {
                _logger.LogInformation("User not found.");
                return Json(new { isValid = false, errorMessage = "User not found." });
            }

            try
            {
                // Validate input
                if (!form.TryGetValue("name", out StringValues name) || string.IsNullOrEmpty(name.ToString()))
                {
                    return Json(new { isValid = false, errorMessage = "Name is required." });
                }
                if (!form.TryGetValue("username", out StringValues username) || string.IsNullOrEmpty(username.ToString()))
                {
                    return Json(new { isValid = false, errorMessage = "Username is required." });
                }
                if (!form.TryGetValue("email", out StringValues email) || string.IsNullOrEmpty(email.ToString()))
                {
                    return Json(new { isValid = false, errorMessage = "Email is required." });
                }
                if (!form.TryGetValue("mobileNumber", out StringValues mobileNumber) || string.IsNullOrEmpty(mobileNumber.ToString()))
                {
                    return Json(new { isValid = false, errorMessage = "Mobile number is required." });
                }

                // Update allowed fields
                user.Name = name.ToString();
                user.Username = username.ToString();
                user.Email = email.ToString();
                user.MobileNumber = mobileNumber.ToString();

                // Handle profile image if uploaded
                if (form.Files.GetFile("profile") is IFormFile profileFile && profileFile.Length > 0)
                {
                    var profile = user.Profile;
                    if (!string.IsNullOrEmpty(profile) && profile != "/assets/images/profile.jpg")
                    {
                        string existingFilePath = Path.Combine(_webHostEnvironment.WebRootPath, profile.TrimStart('/'));
                        if (System.IO.File.Exists(existingFilePath))
                        {
                            try
                            {
                                System.IO.File.Delete(existingFilePath);
                                _logger.LogInformation($"Existing file {existingFilePath} deleted.");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError($"Error deleting file {existingFilePath}: {ex.Message}");
                            }
                        }
                    }
                    var profileFileName = await _helper.GetFilePath(profileFile);
                    _logger.LogInformation($"Profile file path: {profileFileName}");
                    user.Profile = profileFileName;
                }

                // Handle proof of age if uploaded
                string? ageProofFileName = null;
                if (form.Files.GetFile("ageProof") is IFormFile ageProofFile && ageProofFile.Length > 0)
                {
                    // Validate file size (100KB–200KB) and type (PDF)
                    if (ageProofFile.Length < 100 * 1024 || ageProofFile.Length > 200 * 1024)
                    {
                        return Json(new { isValid = false, errorMessage = "Proof of Age file size must be between 100KB and 200KB." });
                    }
                    if (ageProofFile.ContentType != "application/pdf")
                    {
                        return Json(new { isValid = false, errorMessage = "Proof of Age must be a PDF file." });
                    }

                    // Get existing AdditionalDetails or initialize
                    JObject additionalDetails = string.IsNullOrEmpty(user.AdditionalDetails)
                        ? new JObject()
                        : JObject.Parse(user.AdditionalDetails);

                    // Get existing ProofOfAge filename to pass to GetFilePath
                    var existingProofOfAge = additionalDetails["ProofOfAge"]?.ToString();

                    ageProofFileName = await _helper.GetFilePath(ageProofFile, null, existingProofOfAge);
                    _logger.LogInformation($"Proof of Age file path: {ageProofFileName}");

                    // Update AdditionalDetails JSON
                    additionalDetails["ProofOfAge"] = ageProofFileName;
                    user.AdditionalDetails = JsonConvert.SerializeObject(additionalDetails);
                }

                await _dbcontext.SaveChangesAsync();

                _auditService.InsertLog(HttpContext, "Update Profile",
                    ageProofFileName != null ? "Profile and Proof of Age updated successfully." : "Profile updated successfully.",
                    user.UserId, "Success");

                // Get ProofOfAge for response
                var responseAgeProof = string.IsNullOrEmpty(user.AdditionalDetails)
                    ? ""
                    : JObject.Parse(user.AdditionalDetails)["ProofOfAge"]?.ToString() ?? "";

                return Json(new
                {
                    isValid = true,
                    name = user.Name,
                    username = user.Username,
                    email = user.Email,
                    mobileNumber = user.MobileNumber,
                    profile = user.Profile,
                    ageProof = responseAgeProof
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating user details: {ex.Message}");
                return Json(new { isValid = false, errorMessage = "Failed to update user details: " + ex.Message });
            }
        }

    }
}