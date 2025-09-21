using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers.Admin
{
    public partial class AdminController : Controller
    {

        [HttpPost]
        public IActionResult ValidateOfficer(string username)
        {
            try
            {
                if (string.IsNullOrEmpty(username))
                {
                    return BadRequest(new { status = false, message = "Username is required." });
                }

                var officer = dbcontext.Users.FirstOrDefault(u => u.Username == username);
                if (officer == null)
                {
                    return NotFound(new { status = false, message = "Officer not found." });
                }

                // Deserialize AdditionalDetails, handle null case
                var additionalDetails = JsonConvert.DeserializeObject<Dictionary<string, dynamic>>(officer.AdditionalDetails ?? "{}");
                if (additionalDetails == null)
                {
                    return BadRequest(new { status = false, message = "Invalid officer details." });
                }

                // Toggle Validate state
                bool currentValidate = additionalDetails.ContainsKey("Validate") ? additionalDetails["Validate"] : false;
                additionalDetails["Validate"] = !currentValidate;

                // Serialize back to JSON
                officer.AdditionalDetails = JsonConvert.SerializeObject(additionalDetails);
                dbcontext.SaveChanges();

                // Current date and time for response or logging (04:29 PM IST, July 15, 2025)
                string currentDateTime = DateTime.UtcNow.AddHours(5.5).ToString("dd MMM yyyy, hh:mm tt") + " IST";

                return Json(new
                {
                    status = true,
                    message = additionalDetails["Validate"] ? "Officer validated" : "Officer unvalidated",
                    isValidated = additionalDetails["Validate"],
                    updatedAt = currentDateTime
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating officer: {Username}", username);
                return StatusCode(500, new { status = false, message = "An error occurred while validating the officer." });
            }
        }

        [HttpPost]
        public IActionResult AddAdmin([FromForm] IFormCollection form)
        {
            var fullName = new SqlParameter("@Name", form["name"].ToString());
            var username = new SqlParameter("@Username", form["username"].ToString());
            var password = new SqlParameter("@Password", form["passowrd"].ToString());
            var email = new SqlParameter("@Email", form["Email"].ToString());
            var mobileNumber = new SqlParameter("@MobileNumber", form["mobileNumber"].ToString());
            var profile = new SqlParameter("@Profile", "/assets/images/profile.jpg");

            var UserType = new SqlParameter("@UserType", form["role"].ToString().Contains("Admin") ? "Admin" : "Officer");

            var backupCodes = new
            {
                unused = helper.GenerateUniqueRandomCodes(10, 8),
                used = Array.Empty<string>(),
            };

            var AddtionalDetails = new SqlParameter("@AdditionalDetails", form["AdditionalDetails"].ToString());

            var backupCodesParam = new SqlParameter("@BackupCodes", JsonConvert.SerializeObject(backupCodes));

            var registeredDate = new SqlParameter("@RegisteredDate", DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"));

            var result = dbcontext.Users.FromSqlRaw(
                "EXEC RegisterUser @Name, @Username, @Password, @Email, @MobileNumber,@Profile, @UserType, @BackupCodes,@AdditionalDetails, @RegisteredDate",
                fullName, username, password, email, mobileNumber, profile, UserType, backupCodesParam, AddtionalDetails, registeredDate
            ).ToList();

            if (result.Count > 0)
            {
                var userId = new SqlParameter("@OfficerId", result[0].UserId);

                return Json(new { status = true, userId });
            }
            else
            {
                return Json(new { status = false, response = "Registration failed." });
            }
        }

        [HttpPost]
        public IActionResult AddDesignation()
        {
            try
            {
                var designation = Request.Form["Designation"].ToString();
                var designationShort = Request.Form["DesignationShort"].ToString();
                var accessLevel = Request.Form["AccessLevel"].ToString();
                var departmentId = int.Parse(Request.Form["DepartmentId"]!);

                if (string.IsNullOrWhiteSpace(designation) || string.IsNullOrWhiteSpace(designationShort) || string.IsNullOrWhiteSpace(accessLevel))
                {
                    return BadRequest(new { error = "All fields are required" });
                }

                var newDesignation = new OfficersDesignation
                {
                    Designation = designation,
                    DesignationShort = designationShort,
                    AccessLevel = accessLevel,
                    DepartmentId = departmentId
                };

                dbcontext.OfficersDesignations.Add(newDesignation);
                dbcontext.SaveChanges();

                return Json(new { status = true });
            }
            catch (Exception ex)
            {
                // Log the exception (use your logging framework, e.g., Serilog, NLog)
                return StatusCode(500, new
                {
                    error = "An error occurred while adding designation",
                    details = ex.Message
                });
            }
        }
    }
}