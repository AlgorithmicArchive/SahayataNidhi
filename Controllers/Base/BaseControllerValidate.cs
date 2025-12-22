using Emgu.CV;
using Emgu.CV.CvEnum;
using Emgu.CV.Dnn;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
namespace SahayataNidhi.Controllers
{
    public partial class BaseController
    {
        [HttpPost]
        public IActionResult UsernameAlreadyExist([FromForm] IFormCollection form)
        {
            string Username = form["Username"].ToString();
            var isUsernameInUsers = dbcontext.Users.FirstOrDefault(u => u.Username == Username);
            if (isUsernameInUsers == null)
                return Json(new { status = false });
            else
                return Json(new { status = true });
        }
        [HttpPost]
        public IActionResult EmailAlreadyExist([FromForm] IFormCollection form)
        {
            string email = form["email"].ToString();
            var isEmailInUsers = dbcontext.Users.FirstOrDefault(u => u.Email == email);
            if (isEmailInUsers == null)
                return Json(new { status = false });
            else
                return Json(new { status = true });
        }
        [HttpPost]
        public IActionResult MobileNumberAlreadyExist([FromForm] IFormCollection form)
        {
            string MobileNumber = form["MobileNumber"].ToString();
            var isMobileNumberInUsers = dbcontext.Users.FirstOrDefault(u => u.MobileNumber == MobileNumber);
            if (isMobileNumberInUsers == null)
                return Json(new { status = false });
            else
                return Json(new { status = true });
        }
        [HttpPost]
        public IActionResult IsOldPasswordValid([FromForm] IFormCollection form)
        {
            string Password = form["Password"].ToString();
            int? userId = HttpContext.Session.GetInt32("UserId");
            var isPasswordInUsers = dbcontext.Users.FromSqlRaw("EXEC IsOldPasswordValid @UserId,@Password,@TableName", new SqlParameter("@UserId", userId), new SqlParameter("@Password", Password), new SqlParameter("@TableName", "Users")).ToList();
            if (isPasswordInUsers!.Count == 0)
            {
                return Json(new { status = false });
            }
            return Json(new { status = true });
        }
        [HttpPost]
        public IActionResult IsDuplicateAccNo([FromForm] IFormCollection form)
        {
            try
            {
                string bankName = form["bankName"].ToString();
                string ifscCode = form["ifscCode"].ToString();
                string accNo = form["accNo"].ToString();
                string applicationId = form["applicationId"].ToString() ?? "";
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in IsDuplicateAccNo");
                return Json(new { status = false, error = "Internal server error" });
            }
        }

        [HttpPost]
        public IActionResult Validate([FromForm] IFormCollection file)
        {
            if (file == null)
            {
                return Json(new { isValid = false, errorMessage = "Invalid request: No form data received. Check Content-Type and request body." });
            }

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
        [HttpPost]
        public IActionResult ValidateIfscCode([FromForm] IFormCollection form)
        {
            try
            {
                string bankNameOrId = form["bankName"].ToString();
                string ifscCode = form["ifscCode"].ToString();

                // Check if bankNameOrId is empty
                if (string.IsNullOrWhiteSpace(bankNameOrId))
                {
                    return Json(new
                    {
                        status = false,
                        message = "Bank name/ID is required."
                    });
                }

                // Check if IFSC code is empty
                if (string.IsNullOrWhiteSpace(ifscCode))
                {
                    return Json(new
                    {
                        status = false,
                        message = "IFSC code is required."
                    });
                }

                string actualBankName = "";

                // Try to parse as integer (ID)
                if (int.TryParse(bankNameOrId, out int bankId))
                {
                    // It's an ID, get bank name from database
                    var bank = dbcontext.Bank.FirstOrDefault(b => b.Id == bankId);
                    if (bank == null)
                    {
                        return Json(new
                        {
                            status = false,
                            message = "Bank not found with the provided ID."
                        });
                    }
                    actualBankName = bank.BankName;
                }
                else
                {
                    // It's a bank name, use it directly
                    actualBankName = bankNameOrId;

                    // Optional: Verify the bank exists in database
                    var bankExists = dbcontext.Bank.Any(b => b.BankName == actualBankName);
                    if (!bankExists)
                    {
                        return Json(new
                        {
                            status = false,
                            message = "Bank not found with the provided name."
                        });
                    }
                }

                // Execute stored procedure with resolved bank name
                var result = dbcontext.BankDetails
                    .FromSqlRaw(
                        "EXEC ValidateIFSC @bankName, @ifscCode",
                        new SqlParameter("@bankName", actualBankName),
                        new SqlParameter("@ifscCode", ifscCode))
                    .AsEnumerable()
                    .FirstOrDefault();

                if (result == null)
                {
                    return Json(new
                    {
                        status = false,
                        message = "Invalid IFSC code for the specified bank."
                    });
                }

                return Json(new
                {
                    status = true,
                    bankDetails = new
                    {
                        branch = result.Branch,
                        bankName = actualBankName,
                        ifsc = ifscCode
                    }
                });
            }
            catch (Exception ex)
            {
                // Log the exception here
                return Json(new
                {
                    status = false,
                    message = "An error occurred while validating IFSC code."
                });
            }
        }
        [HttpPost]
        public IActionResult GetTeshilForDistrict([FromForm] IFormCollection form)
        {
            string districtId = form["districtId"].ToString();
            if (string.IsNullOrEmpty(districtId))
            {
                return Json(new { status = false, tehsils = new object[0] });
            }
            var parameters = new[] { new SqlParameter("@districtId", districtId) };
            // Assuming a Tehsil entity exists in dbcontext with Id and Name properties
            // Adjust the SQL and entity as per your schema
            var tehsils = dbcontext.Tehsil  // Replace with actual entity name if different
                .FromSqlRaw("EXEC GetTeshilForDistrict @districtId", parameters)
                .Select(t => new { tehsilId = t.TehsilId, tehsilName = t.TehsilName })
                .ToList();
            return Json(new { status = true, tehsils });
        }
    }
}