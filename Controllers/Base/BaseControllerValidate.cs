using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace SahayataNidhi.Controllers
{
    public partial class BaseController
    {
        public IActionResult UsernameAlreadyExist(string Username)
        {
            var isUsernameInUsers = dbcontext.Users.FirstOrDefault(u => u.Username == Username);

            if (isUsernameInUsers == null)
                return Json(new { status = false });
            else
                return Json(new { status = true });
        }

        public IActionResult EmailAlreadyExist(string email)
        {
            var isEmailInUsers = dbcontext.Users.FirstOrDefault(u => u.Email == email);

            if (isEmailInUsers == null)
                return Json(new { status = false });
            else
                return Json(new { status = true });
        }

        public IActionResult MobileNumberAlreadyExist(string MobileNumber)
        {
            var isMobileNumberInUsers = dbcontext.Users.FirstOrDefault(u => u.MobileNumber == MobileNumber);

            if (isMobileNumberInUsers == null)
                return Json(new { status = false });
            else
                return Json(new { status = true });
        }

        public IActionResult IsOldPasswordValid(string Password)
        {
            int? userId = HttpContext.Session.GetInt32("UserId");

            var isPasswordInUsers = dbcontext.Users.FromSqlRaw("EXEC IsOldPasswordValid @UserId,@Password,@TableName", new SqlParameter("@UserId", userId), new SqlParameter("@Password", Password), new SqlParameter("@TableName", "Users")).ToList();

            if (isPasswordInUsers!.Count == 0)
            {
                return Json(new { status = false });
            }

            return Json(new { status = true });
        }

        [HttpGet]
        public IActionResult IsDuplicateAccNo(string bankName, string ifscCode, string accNo, string applicationId)
        {
            // Input validation
            if (string.IsNullOrEmpty(bankName) || string.IsNullOrEmpty(ifscCode) || string.IsNullOrEmpty(accNo))
            {
                return Json(new { status = false });
            }

            var parameters = new[]
            {
                new SqlParameter("@AccountNumber", accNo),
                new SqlParameter("@BankName", bankName),
                new SqlParameter("@IfscCode", ifscCode)
            };

            var applications = dbcontext.CitizenApplications
                .FromSqlRaw("EXEC GetDuplicateAccNo @AccountNumber, @BankName, @IfscCode", parameters)
                .ToList();

            if (applications.Count == 0)
            {
                return Json(new { status = false });
            }

            // Exclude current application from the duplicates
            var otherApplications = applications
                .Where(app => string.IsNullOrWhiteSpace(applicationId) || app.ReferenceNumber != applicationId)
                .ToList();

            _logger.LogInformation($"----------- Found {otherApplications.Count} other applications for account {accNo}. -----------------");

            // If no other applications, then not a duplicate
            if (otherApplications.Count == 0)
            {
                return Json(new { status = false });
            }

            // If any of the other applications are NOT rejected, it's a duplicate
            if (otherApplications.Any(app => app.Status != "Rejected"))
            {
                return Json(new { status = true });
            }

            // All are rejected → not considered duplicate
            return Json(new { status = false });
        }

        [HttpPost]
        public IActionResult Validate([FromForm] IFormCollection file)
        {
            // Ensure a file is provided
            if (file.Files.Count == 0)
            {
                return Json(new { isValid = false, errorMessage = "No file uploaded." });
            }

            var uploadedFile = file.Files[0];
            string fileType = file["fileType"].ToString();

            using (var fileStream = uploadedFile.OpenReadStream())
            {
                byte[] fileHeader = new byte[4];
                fileStream.ReadExactly(fileHeader, 0, 4); // Read first 4 bytes of the file

                string fileExtension = Path.GetExtension(uploadedFile.FileName)?.ToLower()!;

                // Check if the file type is an image
                if (fileType == "image")
                {
                    if (!IsValidImage(fileHeader, fileExtension))
                    {
                        return Json(new { isValid = false, errorMessage = "The uploaded file is not a valid image." });
                    }

                    // If it's a valid image, check the file size
                    if (uploadedFile.Length < MinImageFile || uploadedFile.Length > MaxImageFile)
                    {
                        return Json(new { isValid = false, errorMessage = "Image file size must be between 20KB and 50KB." });
                    }
                }
                // Check if the file type is a PDF
                else if (fileType == "pdf")
                {
                    if (!IsValidPdf(fileHeader, fileExtension))
                    {
                        return Json(new { isValid = false, errorMessage = "The uploaded file is not a valid PDF." });
                    }

                    // If it's a valid PDF, check the file size
                    if (uploadedFile.Length < MinPdfFile || uploadedFile.Length > MaxPdfFile)
                    {
                        return Json(new { isValid = false, errorMessage = "PDF file size must be between 100KB and 200KB." });
                    }
                }
                else
                {
                    return Json(new { isValid = false, errorMessage = "Unsupported file type." });
                }
            }

            // If all checks pass, return success
            return Json(new { isValid = true, message = "" });
        }

        private static bool IsValidImage(byte[] header, string fileExtension)
        {
            // PNG: 89 50 4E 47 (hex) / JPG: FF D8 FF E0 or FF D8 FF E1
            if (fileExtension == ".png" && header[0] == 0x89 && header[1] == 0x50 &&
                header[2] == 0x4E && header[3] == 0x47)
            {
                return true;
            }

            if (fileExtension == ".jpg" || fileExtension == ".jpeg")
            {
                return header[0] == 0xFF && header[1] == 0xD8 && (header[2] == 0xFF);
            }

            return false;
        }

        private static bool IsValidPdf(byte[] header, string fileExtension)
        {
            // PDF files start with: 25 50 44 46 (hex)
            return fileExtension == ".pdf" && header[0] == 0x25 && header[1] == 0x50 &&
                header[2] == 0x44 && header[3] == 0x46;
        }

        [HttpGet]
        public IActionResult ValidateIfscCode(string bankName, string ifscCode)
        {
            var result = dbcontext.BankDetails
                .FromSqlRaw("EXEC ValidateIFSC @bankName, @ifscCode",
                    new SqlParameter("@bankName", bankName),
                    new SqlParameter("@ifscCode", ifscCode))
                .AsEnumerable()
                .ToList();

            if (result.Count == 0)
            {
                return Json(new { status = true });
            }

            return Json(new { status = false });
        }



    }
}