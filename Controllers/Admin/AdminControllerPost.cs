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
            try
            {
                // ✅ Validate required fields
                if (string.IsNullOrEmpty(form["name"]) || string.IsNullOrEmpty(form["username"]) ||
                    string.IsNullOrEmpty(form["password"]) || string.IsNullOrEmpty(form["email"]) ||
                    string.IsNullOrEmpty(form["mobileNumber"]) || string.IsNullOrEmpty(form["role"]))
                {
                    return Json(new { status = false, response = "Missing required fields" });
                }

                // ✅ Prepare SQL parameters (in correct order)
                var fullName = new SqlParameter("@Name", form["name"].ToString());
                var username = new SqlParameter("@Username", form["username"].ToString());
                var password = new SqlParameter("@Password", form["password"].ToString()); // Should be hashed
                var email = new SqlParameter("@Email", form["email"].ToString());
                var mobileNumber = new SqlParameter("@MobileNumber", form["mobileNumber"].ToString());
                var profile = new SqlParameter("@Profile", "/assets/images/profile.jpg");
                var userType = new SqlParameter("@UserType", form["role"].ToString().Contains("Admin") ? "Admin" : "Officer");

                // ✅ Backup codes
                var backupCodes = new
                {
                    unused = helper.GenerateUniqueRandomCodes(10, 8),
                    used = Array.Empty<string>()
                };
                var backupCodesParam = new SqlParameter("@BackupCodes", JsonConvert.SerializeObject(backupCodes));

                // ✅ AdditionalDetails (ensure Department if required)
                var additionalDetailsJson = form["AdditionalDetails"].ToString();
                if (string.IsNullOrEmpty(additionalDetailsJson))
                {
                    return Json(new { status = false, response = "AdditionalDetails is required" });
                }

                dynamic additionalDetails = JsonConvert.DeserializeObject(additionalDetailsJson)!;
                if (!string.IsNullOrEmpty(form["department"]))
                {
                    additionalDetails.Department = int.Parse(form["department"]!);
                }

                var additionalDetailsParam = new SqlParameter("@AddtionalDetails", JsonConvert.SerializeObject(additionalDetails));

                // ✅ Registered Date
                var registeredDate = new SqlParameter("@RegisteredDate", DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"));

                // ✅ Execute Stored Procedure (NO extra parameters, correct order)
                var result = dbcontext.Users.FromSqlRaw(
                    "EXEC RegisterUser @Name, @Username, @Password, @Email, @MobileNumber, @Profile, @UserType, @BackupCodes, @AddtionalDetails, @RegisteredDate",
                    fullName, username, password, email, mobileNumber, profile, userType,
                    backupCodesParam, additionalDetailsParam, registeredDate
                ).ToList();

                if (result.Count > 0)
                {
                    return Json(new { status = true, userId = result[0].UserId });
                }
                else
                {
                    return Json(new { status = false, response = "Registration failed." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { status = false, response = $"Error creating admin: {ex.Message}" });
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

                var newDesignation = new OfficersDesignations
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

        [HttpPost]
        public IActionResult UpdateDesignation([FromForm] IFormCollection form)
        {
            try
            {
                // Retrieve officer details for authorization
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return BadRequest(new { error = "Officer details not found" });
                }

                // Extract form data
                var designationIdString = form["DesignationId"].ToString();
                var designation = form["Designation"].ToString();
                var designationShort = form["DesignationShort"].ToString();
                var accessLevel = form["AccessLevel"].ToString();
                var departmentIdString = form["DepartmentId"].ToString();

                // Validate input
                if (string.IsNullOrWhiteSpace(designationIdString) || string.IsNullOrWhiteSpace(designation) ||
                    string.IsNullOrWhiteSpace(designationShort) || string.IsNullOrWhiteSpace(accessLevel) ||
                    string.IsNullOrWhiteSpace(departmentIdString))
                {
                    return BadRequest(new { error = "All fields are required" });
                }

                // Parse DesignationId and DepartmentId
                if (!int.TryParse(designationIdString, out var designationId))
                {
                    return BadRequest(new { error = "Invalid DesignationId format; must be an integer" });
                }
                if (!int.TryParse(departmentIdString, out var departmentId))
                {
                    return BadRequest(new { error = "Invalid DepartmentId format; must be an integer" });
                }

                // Ensure the designation exists and belongs to the officer's department
                var existingDesignation = dbcontext.OfficersDesignations
                    .FirstOrDefault(d => d.Uuid == designationId && d.DepartmentId == officer.Department);
                if (existingDesignation == null)
                {
                    return NotFound(new { error = "Designation not found or you do not have permission to update it" });
                }

                // Update designation details
                existingDesignation.Designation = designation;
                existingDesignation.DesignationShort = designationShort;
                existingDesignation.AccessLevel = accessLevel;
                existingDesignation.DepartmentId = departmentId;

                dbcontext.SaveChanges();

                return Json(new { status = true });
            }
            catch (Exception ex)
            {
                // Log the exception (use your logging framework, e.g., Serilog, NLog)
                return StatusCode(500, new
                {
                    error = "An error occurred while updating designation",
                    details = ex.Message
                });
            }
        }

        [HttpPost]
        public IActionResult DeleteDesignation([FromForm] IFormCollection form)
        {
            try
            {
                // Retrieve officer details for authorization
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return BadRequest(new { error = "Officer details not found" });
                }

                // Extract form data
                var designationIdString = form["DesignationId"].ToString();

                // Validate input
                if (string.IsNullOrWhiteSpace(designationIdString))
                {
                    return BadRequest(new { error = "DesignationId is required" });
                }

                // Parse DesignationId
                if (!int.TryParse(designationIdString, out var designationId))
                {
                    return BadRequest(new { error = "Invalid DesignationId format; must be an integer" });
                }

                // Ensure the designation exists and belongs to the officer's department
                var designation = dbcontext.OfficersDesignations
                    .FirstOrDefault(d => d.Uuid == designationId && d.DepartmentId == officer.Department);
                if (designation == null)
                {
                    return NotFound(new { error = "Designation not found or you do not have permission to delete it" });
                }

                // Remove designation
                dbcontext.OfficersDesignations.Remove(designation);
                dbcontext.SaveChanges();

                return Json(new { status = true });
            }
            catch (Exception ex)
            {
                // Log the exception (use your logging framework, e.g., Serilog, NLog)
                return StatusCode(500, new
                {
                    error = "An error occurred while deleting designation",
                    details = ex.Message
                });
            }
        }

        [HttpPost]
        public IActionResult AddDepartment([FromForm] string DepartmentName)
        {
            try
            {
                var department = new Departments { DepartmentName = DepartmentName };
                dbcontext.Departments.Add(department);
                dbcontext.SaveChanges();
                return Json(new { status = true });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult UpdateDepartment([FromForm] int DepartmentId, [FromForm] string DepartmentName)
        {
            try
            {
                var department = dbcontext.Departments.Find(DepartmentId);
                if (department == null)
                    return Json(new { status = false, message = "Department not found" });

                department.DepartmentName = DepartmentName;
                dbcontext.SaveChanges();
                return Json(new { status = true });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult DeleteDepartment([FromForm] int DepartmentId)
        {
            try
            {
                var department = dbcontext.Departments.Find(DepartmentId);
                if (department == null)
                    return Json(new { status = false, message = "Department not found" });

                dbcontext.Departments.Remove(department);
                dbcontext.SaveChanges();
                return Json(new { status = true });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddOffice([FromForm] IFormCollection form)
        {
            try
            {
                if (!form.TryGetValue("OfficeType", out var officeTypeValues) || string.IsNullOrWhiteSpace(officeTypeValues[0]))
                    return Json(new { status = false, message = "Office Type is required." });

                if (!form.TryGetValue("AccessLevel", out var accessLevelValues) || string.IsNullOrWhiteSpace(accessLevelValues[0]))
                    return Json(new { status = false, message = "Access Level is required." });

                if (!form.TryGetValue("DepartmentId", out var deptIdValues) || !int.TryParse(deptIdValues[0], out int departmentId))
                    return Json(new { status = false, message = "Invalid Department ID." });

                var office = new Offices
                {
                    DepartmentId = departmentId,
                    OfficeType = officeTypeValues[0]!.Trim(),
                    AccessLevel = accessLevelValues[0]!.Trim()
                };

                dbcontext.Offices.Add(office);
                await dbcontext.SaveChangesAsync();

                return Json(new { status = true, message = "Office added successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }

        // POST: /Admin/UpdateOffice
        [HttpPost]
        public async Task<IActionResult> UpdateOffice([FromForm] IFormCollection form)
        {
            try
            {
                if (!form.TryGetValue("OfficeId", out var idValues) || !int.TryParse(idValues[0], out int officeId))
                    return Json(new { status = false, message = "Invalid Office ID." });

                if (!form.TryGetValue("OfficeType", out var officeTypeValues) || string.IsNullOrWhiteSpace(officeTypeValues[0]))
                    return Json(new { status = false, message = "Office Type is required." });

                if (!form.TryGetValue("AccessLevel", out var accessLevelValues) || string.IsNullOrWhiteSpace(accessLevelValues[0]))
                    return Json(new { status = false, message = "Access Level is required." });

                if (!form.TryGetValue("DepartmentId", out var deptIdValues) || !int.TryParse(deptIdValues[0], out int departmentId))
                    return Json(new { status = false, message = "Invalid Department ID." });

                var office = await dbcontext.Offices.FindAsync(officeId);
                if (office == null)
                    return Json(new { status = false, message = "Office not found." });

                // Optional: Prevent cross-department edits
                if (office.DepartmentId != departmentId)
                    return Json(new { status = false, message = "You cannot modify offices from another department." });

                office.OfficeType = officeTypeValues[0]!.Trim();
                office.AccessLevel = accessLevelValues[0]!.Trim();

                await dbcontext.SaveChangesAsync();

                return Json(new { status = true, message = "Office updated successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }

        // POST: /Admin/DeleteOffice
        [HttpPost]
        public async Task<IActionResult> DeleteOffice([FromForm] IFormCollection form)
        {
            try
            {
                if (!form.TryGetValue("OfficeId", out var idValues) || !int.TryParse(idValues[0], out int officeId))
                    return Json(new { status = false, message = "Invalid Office ID." });

                var office = await dbcontext.Offices.FindAsync(officeId);
                if (office == null)
                    return Json(new { status = false, message = "Office not found." });

                dbcontext.Offices.Remove(office);
                await dbcontext.SaveChangesAsync();

                return Json(new { status = true, message = "Office deleted successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }

    }
}