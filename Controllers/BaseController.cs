using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers
{
    public class BaseController(SocialWelfareDepartmentContext dbcontext, ILogger<BaseController> logger) : Controller
    {
        protected readonly SocialWelfareDepartmentContext dbcontext = dbcontext;
        protected readonly ILogger<BaseController> _logger = logger;

        private const long MinImageFile = 20 * 1024;  // 20KB
        private const long MaxImageFile = 50 * 1024;  // 50KB
        private const long MinPdfFile = 100 * 1024; // 100KB
        private const long MaxPdfFile = 200 * 1024; // 200KB



        public OfficerDetailsModal? GetOfficerDetails()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                // Log the issue for debugging
                _logger.LogWarning("GetOfficerDetails: UserId is null. User is not authenticated or NameIdentifier claim is missing.");
                return null;
            }

            _logger.LogInformation($"------- User ID: {userId} --------");

            var parameter = new SqlParameter("@UserId", userId);
            var officer = dbcontext.Database
                .SqlQuery<OfficerDetailsModal>($"EXEC GetOfficerDetails @UserId = {parameter}")
                .AsEnumerable()
                .FirstOrDefault();

            return officer;
        }

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

        // public int GetCount(string type, Dictionary<string, string> conditions)
        // {
        //     StringBuilder Condition1 = new StringBuilder();
        //     StringBuilder Condition2 = new StringBuilder();

        //     if (type == "Pending")
        //         Condition1.Append("AND application.ApplicationStatus='Initiated'");
        //     else if (type == "Sanction")
        //         Condition1.Append("AND application.ApplicationStatus='Sanctioned'");
        //     else if (type == "Reject")
        //         Condition1.Append("AND application.ApplicationStatus='Rejected'");
        //     else if (type == "PendingWithCitizen")
        //         Condition1.Append("AND Application.ApplicationStatus='Initiated' AND JSON_VALUE(app.value, '$.ActionTaken')='ReturnToEdit'");

        //     int conditionCount = 0;
        //     int splitPoint = conditions != null ? conditions.Count / 2 : 0;

        //     if (conditions != null && conditions.Count != 0)
        //     {
        //         foreach (var condition in conditions)
        //         {
        //             if (conditionCount < splitPoint)
        //                 Condition1.Append($" AND {condition.Key}='{condition.Value}'");
        //             else
        //                 Condition2.Append($" AND {condition.Key}='{condition.Value}'");

        //             conditionCount++;
        //         }

        //     }

        //     if (conditions != null && conditions.ContainsKey("JSON_VALUE(app.value, '$.Officer')") && type != "Total")
        //     {
        //         Condition2.Append($" AND JSON_VALUE(app.value, '$.ActionTaken') = '{type}'");
        //     }
        //     else if (type == "Total")
        //     {
        //         Condition2.Append($" AND JSON_VALUE(app.value, '$.ActionTaken') != ''");
        //     }

        //     int count = dbcontext.Applications.FromSqlRaw("EXEC GetApplications @Condition1, @Condition2",
        // new SqlParameter("@Condition1", Condition1.ToString()),
        // new SqlParameter("@Condition2", Condition2.ToString())).ToList().Count;

        //     return count;
        // }

        // public IActionResult GetFilteredCount(string? conditions)
        // {
        //     var Conditions = JsonConvert.DeserializeObject<Dictionary<string, string>>(conditions!);
        //     int TotalCount = GetCount("Total", Conditions!);
        //     int PendingCount = GetCount("Pending", Conditions!);
        //     int RejectCount = GetCount("Reject", Conditions!);
        //     int SanctionCount = GetCount("Sanction", Conditions!);

        //     return Json(new { status = true, TotalCount, PendingCount, RejectCount, SanctionCount });
        // }

        // [HttpGet]
        // public IActionResult GetApplicationsCount(int? ServiceId = null, int? DistrictId = null)
        // {
        //     var officerDetails = GetOfficerDetails();

        //     var authorities = dbcontext.WorkFlows.FirstOrDefault(wf => wf.ServiceId == ServiceId && wf.Role == officerDetails!.Role);
        //     _logger.LogInformation($"------Access Level: {officerDetails.AccessLevel}--------");

        //     var officer = dbcontext.OfficerDetails.FirstOrDefault(od => od.OfficerId == officerDetails.UserId);
        //     var districts = dbcontext.Districts
        //     .Where(d =>
        //         (officer!.AccessLevel == "District" && officer.AccessCode == d.DistrictId) || // Match single district
        //         (officer.AccessLevel == "Division" && officer.AccessCode == d.Division) ||  // Match all districts in division
        //         (officer.AccessLevel == "State")) // Match all districts for state-level access
        //     .Select(d => new
        //     {
        //         label = d.DistrictName,
        //         value = d.DistrictId
        //     })
        //     .ToList();



        //     var services = dbcontext.Services
        //         .Select(s => new
        //         {
        //             label = s.ServiceName,
        //             value = s.ServiceId
        //         })
        //         .ToList();

        //     // Populate lists directly
        //     List<dynamic> Districts = districts.Cast<dynamic>().ToList();
        //     List<dynamic> Services = services.Cast<dynamic>().ToList();


        //     var serviceIdParam = new SqlParameter("@ServiceId", (object)ServiceId! ?? DBNull.Value);
        //     var districtIdParam = new SqlParameter("@DistrictId", (object)DistrictId! ?? DBNull.Value);
        //     var accessLevelParam = new SqlParameter("@AccessLevel", officerDetails.AccessLevel);
        //     var accessCodeParam = new SqlParameter("@AccessCode", officerDetails.AccessCode);

        //     // Execute the stored procedure with parameters
        //     var counts = dbcontext.Database
        //         .SqlQueryRaw<StatusCountsSA>(
        //             "EXEC GetStatusCount_SA @ServiceId, @DistrictId, @AccessLevel, @AccessCode",
        //              serviceIdParam, districtIdParam, accessLevelParam, accessCodeParam)
        //         .AsEnumerable()
        //         .FirstOrDefault();

        //     List<dynamic> countList = [];
        //     countList.Add(new { label = "Total", count = counts!.TotalApplications, bgColor = "#F0C38E", textColor = "#312C51" });
        //     countList.Add(new { label = "Pending", count = counts!.PendingCount, bgColor = "#FFC107", textColor = "#000000" });
        //     countList.Add(new { label = "Citizen Pending", count = counts!.ReturnToEditCount, bgColor = "#CE93D8", textColor = "#4A148C" });
        //     countList.Add(new { label = "Sanctioned", count = counts!.SanctionCount, bgColor = "#81C784", textColor = "#1B5E20" });
        //     countList.Add(new { label = "Disbursed", count = counts!.DisbursedCount, bgColor = "#4CAF50", textColor = "#FFFFFF" });
        //     countList.Add(new { label = "Failed Payment", count = counts!.FailureCount, bgColor = "#FF7043", textColor = "#B71C1C" });
        //     countList.Add(new { label = "Rejected", count = counts!.RejectCount, bgColor = "#FF7043", textColor = "#B71C1C" });

        //     return Json(new { countList, Districts, Services });
        // }

        public IActionResult GetApplicationsCount(int? ServiceId = null, int? DistrictId = null)
        {
            // Get the current officer's details.
            var officer = GetOfficerDetails();
            if (officer == null)
            {
                return Unauthorized();
            }

            // Retrieve the service record.
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == ServiceId);
            if (service == null)
            {
                return NotFound();
            }

            // Deserialize the OfficerEditableField JSON.
            // Assuming the JSON is an array of objects.
            var workflow = JsonConvert.DeserializeObject<List<dynamic>>(service.OfficerEditableField!);
            if (workflow == null || workflow.Count == 0)
            {
                return Json(new { countList = new List<dynamic>(), canSanction = false });
            }

            // Find the authority record for the officer's role.
            // The JSON field names must match those in your stored JSON.
            dynamic authorities = workflow.FirstOrDefault(p => p.designation == officer.Role)!;
            if (authorities == null)
            {
                return Json(new { countList = new List<dynamic>(), canSanction = false });
            }


            var sqlParams = new List<SqlParameter>
            {
                new SqlParameter("@AccessLevel", officer.AccessLevel),
                new SqlParameter("@AccessCode", DistrictId ?? 0),  // or TehsilId
                new SqlParameter("@ServiceId", ServiceId ?? 0),
                new SqlParameter("@TakenBy", officer.Role)
            };

            // Add DivisionCode only when required
            if (officer.AccessLevel == "Division")
            {
                sqlParams.Add(new SqlParameter("@DivisionCode", officer.AccessCode));
            }
            else
            {
                sqlParams.Add(new SqlParameter("@DivisionCode", DBNull.Value));
            }

            var counts = dbcontext.Database
                .SqlQueryRaw<StatusCounts>(
                    "EXEC GetStatusCount @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode",
                    sqlParams.ToArray()
                )
                .AsEnumerable()
                .FirstOrDefault() ?? new StatusCounts();



            _logger.LogInformation($"-------------COUNTS: {JsonConvert.SerializeObject(counts)}-----------------------");


            // Build the count list based on the available authority permissions.
            var countList = new List<dynamic>
            {
                new
                {
                    label = "Total Applications",
                    count = counts.TotalApplications,
                    bgColor = "#000000",
                    textColor = "#FFFFFF"
                },

                // Pending is always included.
                new
                {
                    label = "Pending",
                    count = counts.PendingCount,
                    bgColor = "#FFC107",
                    textColor = "#212121"
                }
            };

            // Forwarded (if allowed)
            if ((bool)authorities.canForwardToPlayer)
            {
                countList.Add(new
                {
                    label = "Forwarded",
                    count = counts.ForwardedCount,
                    bgColor = "#64B5F6",
                    textColor = "#0D47A1"
                });
            }

            // Returned (if allowed)
            if ((bool)authorities.canReturnToPlayer)
            {
                countList.Add(new
                {
                    label = "Returned",
                    count = counts.ReturnedCount,
                    bgColor = "#E0E0E0",
                    textColor = "#212121"
                });
            }

            // Citizen Pending (if allowed)
            if ((bool)authorities.canReturnToCitizen)
            {
                countList.Add(new
                {
                    label = "Citizen Pending",
                    count = counts.ReturnToEditCount,
                    bgColor = "#CE93D8",
                    textColor = "#4A148C"
                });
            }

            // Rejected (if allowed)
            if ((bool)authorities.canReject)
            {
                countList.Add(new
                {
                    label = "Rejected",
                    count = counts.RejectCount,
                    bgColor = "#FF7043",
                    textColor = "#B71C1C"
                });
            }

            // Sanctioned (if allowed)
            if ((bool)authorities.canSanction)
            {
                countList.Add(new
                {
                    label = "Sanctioned",
                    count = counts.SanctionedCount,
                    bgColor = "#81C784",
                    textColor = "#1B5E20"
                });
            }

            countList.Add(new
            {
                label = "Disbursed",
                count = counts.DisbursedCount,
                bgColor = "#ABCDEF",
                textColor = "#123456"
            });

            // Return the count list and whether the officer can sanction.
            return Json(new { countList, canSanction = (bool)authorities.canSanction });
        }


        public string GetFieldValue(string fieldName, dynamic data)
        {
            foreach (var section in data)
            {
                if (section.First is JArray fields)
                {
                    foreach (var field in fields)
                    {
                        if (field["name"] != null && field["name"]?.ToString() == fieldName)
                        {
                            return field["value"]?.ToString() ?? "";
                        }
                    }
                }
            }
            return "";
        }



        [HttpGet]
        public IActionResult GetDesignations()
        {
            // JsonConvert.DeserializeObject
            var designations = dbcontext.OfficersDesignations.Where(des => !des.Designation!.Contains("Admin")).ToList();
            return Json(new { status = true, designations });
        }

        [HttpGet]
        public IActionResult GetServices()
        {
            var officer = GetOfficerDetails();
            _logger.LogInformation($"----- Officer ROLE: {officer!.Role} -------------------");

            if (officer!.Role == "Designer")
            {
                var Services = dbcontext.Services.ToList();
                return Json(new { status = true, services = Services });
            }

            // Fetch the service list for the given role
            var roleParameter = new SqlParameter("@Role", officer!.Role);
            var services = dbcontext.Database
                                       .SqlQuery<OfficerServiceListModal>($"EXEC GetServicesByRole @Role = {roleParameter}")
                                       .AsEnumerable() // To avoid composability errors
                                       .ToList();

            return Json(new { status = true, services });
        }

        [HttpPost]
        public IActionResult FormElement([FromForm] IFormCollection form)
        {
            string serviceIdString = form["serviceId"].ToString();
            string serviceName = form["serviceName"].ToString();
            string serviceNameShort = form["serviceNameShort"].ToString();
            string departmentName = form["departmentName"].ToString();

            var formElement = form["formElement"].ToString();

            if (!string.IsNullOrEmpty(serviceIdString))
            {
                int serviceId = Convert.ToInt32(serviceIdString);
                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);

                if (service != null)
                {
                    if (service.FormElement != formElement)
                        service.FormElement = formElement;

                    if (service.ServiceName != serviceName)
                        service.ServiceName = serviceName;

                    if (service.NameShort != serviceNameShort)
                        service.NameShort = serviceNameShort;

                    if (service.Department != departmentName)
                        service.Department = departmentName;
                }
            }
            else
            {
                var newService = new Service
                {
                    FormElement = formElement,
                    ServiceName = serviceName,
                    NameShort = serviceNameShort,
                    Department = departmentName
                };

                dbcontext.Services.Add(newService);
            }


            dbcontext.SaveChanges();

            return Json(new { status = true });
        }

        [HttpPost]
        public IActionResult WorkFlowPlayers([FromForm] IFormCollection form)
        {
            string serviceIdString = form["serviceId"].ToString();
            var workFlowPlayers = form["workflowplayers"].ToString();

            if (!string.IsNullOrEmpty(serviceIdString))
            {
                int serviceId = Convert.ToInt32(serviceIdString);
                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
                if (service != null)
                {
                    _logger.LogInformation("-----------INSIDE IF----------------");
                    service.OfficerEditableField = workFlowPlayers;
                    dbcontext.Services.Update(service);
                }
            }
            else
            {
                var newService = new Service
                {
                    OfficerEditableField = workFlowPlayers
                };
                dbcontext.Services.Add(newService);
            }

            dbcontext.SaveChanges();

            return Json(new { status = true });
        }

        public IActionResult GetFormElements(string serviceId)
        {
            // Fetch the service JSON string
            var service = dbcontext.Services
                .FirstOrDefault(s => s.ServiceId == Convert.ToInt32(serviceId));

            if (service == null || string.IsNullOrWhiteSpace(service.FormElement))
            {
                return BadRequest(new { error = "Invalid serviceId or no form elements found." });
            }

            // Parse the JSON into a JToken
            JToken root = JToken.Parse(service.FormElement);

            // Extract all "name" values anywhere in the structure
            List<string> allNames = root
                .SelectTokens("$..name")   // recursive descent for every 'name' property
                .Select(token => (string)token!)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .ToList();

            // Return as JSON
            return Json(new { names = allNames });
        }

        [HttpGet]
        public IActionResult GetService()
        {
            var service = dbcontext.Services.Where(ser => ser.ServiceId == 4).FirstOrDefault();
            return Json(new { status = true, formElement = service!.FormElement });
        }

        [HttpGet]
        public IActionResult GetAccessAreas()
        {
            var officer = GetOfficerDetails();
            if (officer == null)
            {
                var Districts = dbcontext.Districts.ToList();
                return Json(new { status = true, districts = Districts });
            }
            if (officer!.AccessLevel == "Tehsil")
            {
                var tehsils = dbcontext.Tehsils.Where(t => t.TehsilId == officer.AccessCode).ToList();
                return Json(new { status = true, tehsils });
            }
            var districts = dbcontext.Districts.Where(d => (officer.AccessLevel == "State") || (officer!.AccessLevel == "Division" && d.Division == officer.AccessCode) || (officer.AccessLevel == "District" && d.DistrictId == officer.AccessCode)).ToList();
            return Json(new { status = true, districts });
        }


        [HttpGet]
        public IActionResult GetTeshilForDistrict(string districtId)
        {
            int DistrictId = Convert.ToInt32(districtId);
            var tehsils = dbcontext.Tehsils.Where(u => u.DistrictId == DistrictId).ToList();
            return Json(new { status = true, tehsils });
        }

        // [HttpGet]
        // public IActionResult GetBlockForDistrict(string districtId)
        // {
        //     int DistrictId = Convert.ToInt32(districtId);
        //     var blocks = dbcontext.Blocks.Where(u => u.DistrictId == DistrictId).ToList();
        //     return Json(new { status = true, blocks });
        // }

        [HttpGet]
        public IActionResult IsDuplicateAccNo(string accNo, string applicationId)
        {
            var application = dbcontext.CitizenApplications.FromSqlRaw("EXEC GetDuplicateAccNo @AccountNo", new SqlParameter("@AccountNo", accNo)).ToList();

            if (application.Count == 0)
                return Json(new { status = false });
            else if (application[0].ReferenceNumber == applicationId)
                return Json(new { status = false });
            else
            {
                if (application[0].Status == "Rejected") return Json(new { status = false });
                else return Json(new { status = true });
            }
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
        public IActionResult GetLetterDetails(int serviceId, string objField)
        {
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
            if (service == null || string.IsNullOrWhiteSpace(service.Letters))
            {
                return NotFound("Service or Letters data not found.");
            }

            try
            {
                var json = JObject.Parse(service.Letters);

                if (!json.TryGetValue(objField, out var requiredObj))
                {
                    return NotFound($"Field '{objField}' not found in Letters.");
                }

                return Json(new { requiredObj });
            }
            catch (JsonException ex)
            {
                return BadRequest($"Invalid JSON format: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveLetterDetails(int serviceId, string objField, string letterData)
        {
            // Find the service by serviceId
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
            if (service == null)
            {
                return NotFound(new { status = false, message = "Service not found." });
            }

            try
            {
                // Validate inputs
                if (string.IsNullOrWhiteSpace(objField))
                {
                    return BadRequest(new { status = false, message = "Object field (objField) cannot be empty." });
                }
                if (string.IsNullOrWhiteSpace(letterData))
                {
                    return BadRequest(new { status = false, message = "Letter data cannot be empty." });
                }

                // Parse incoming letterData
                var newJson = JObject.Parse(letterData);
                if (newJson[objField] == null)
                {
                    return BadRequest(new { status = false, message = $"Invalid letter data: '{objField}' object required." });
                }

                // Parse existing Letters JSON or initialize a new JObject if null/empty
                JObject existingJson = string.IsNullOrWhiteSpace(service.Letters)
                    ? []
                    : JObject.Parse(service.Letters);

                // Update the specified object in the existing JSON, preserving other objects
                existingJson[objField] = newJson[objField];

                // Update the Letters field with the merged JSON
                service.Letters = existingJson.ToString();
                dbcontext.Services.Update(service);
                await dbcontext.SaveChangesAsync();

                return Json(new { status = true, message = $"{objField} letter updated successfully." });
            }
            catch (JsonException ex)
            {
                return BadRequest(new { status = false, message = $"Invalid JSON format: {ex.Message}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error updating {objField} letter: {ex.Message}" });
            }
        }


        [HttpGet]
        public IActionResult GetIFSCCode(string bankName, string branchName)
        {
            // Validate input parameters
            if (string.IsNullOrWhiteSpace(bankName) || string.IsNullOrWhiteSpace(branchName))
            {
                return BadRequest(new { status = false, message = "BankName and BranchName are required." });
            }

            try
            {
                if (bankName == "JK GRAMEEN BANK")
                {
                    return Ok(new { status = true, ifscCode = "JAKA0GRAMEN" });
                }
                string cleanedBankName = bankName;
                if (cleanedBankName.StartsWith("THE ", StringComparison.OrdinalIgnoreCase))
                {
                    cleanedBankName = cleanedBankName.Substring(4).TrimStart();
                }
                // Execute the stored procedure
                var ifscCode = dbcontext.Database
                .SqlQueryRaw<string>(
                    "EXEC GetIfscCode @BankName, @BranchName",
                    new SqlParameter("@BankName", cleanedBankName),
                    new SqlParameter("@BranchName", branchName))
                .AsNoTracking()
                .AsEnumerable()
                .FirstOrDefault();

                if (!string.IsNullOrEmpty(ifscCode))
                {
                    return Ok(new { status = true, ifscCode });
                }
                else
                {
                    return NotFound(new { status = false, message = "No IFSC code found for the provided bank and branch." });
                }
            }
            catch (Exception ex)
            {
                // Log the exception (use a logging framework like Serilog in production)
                return StatusCode(500, new { status = false, message = "An error occurred while fetching the IFSC code.", error = ex.Message });
            }
        }

        [HttpGet]
        [HttpGet]
        public IActionResult GetServicesDashboard(int pageIndex = 0, int pageSize = 10)
        {
            // Fetch all services from the database
            var services = dbcontext.Services
                                    .OrderBy(s => s.ServiceId)
                                    .ToList();

            var totalRecords = services.Count;

            // Apply pagination
            var pagedData = services
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();

            // Define columns (Actions column can be added if needed)
            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey = "sno" },
                new { header = "Service Name", accessorKey = "servicename" },
                new { header = "Department", accessorKey = "department" },
            };

            // Prepare data
            var data = new List<dynamic>();
            int index = 0;

            foreach (var item in pagedData)
            {
                var actions = new List<dynamic>
                {
                    new
                    {
                        id = (pageIndex * pageSize) + index + 1,
                        tooltip = item.Active ? "Deactivate" : "Activate",
                        color = "#F0C38E",
                        actionFunction = "ToggleServiceActivation"
                    }
                };

                data.Add(new
                {
                    sno = (pageIndex * pageSize) + index + 1,
                    servicename = item.ServiceName,
                    department = item.Department,
                    serviceId = item.ServiceId,
                    isActive = item.Active,
                    customActions = actions,
                });

                index++;
            }

            return Json(new
            {
                data,
                columns,
                totalRecords
            });
        }



        [HttpGet]
        public IActionResult GetWebServicesDashboard(int pageIndex = 0, int pageSize = 10)
        {
            // Fetch all services from the database
            var webServices = dbcontext.WebServices
                                       .Include(ws => ws.Service) // Assuming navigation property
                                       .ToList();

            var totalRecords = webServices.Count;

            var pagedData = webServices
                .OrderBy(w => w.Id)
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();

            // Define columns (Actions column last)
            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey = "sno" },
                new { header = "Service Name", accessorKey = "servicename" },
                new { header = "Web Service Name", accessorKey = "webservicename" },
            };

            // Prepare data
            var data = new List<dynamic>();
            int index = 0;

            foreach (var item in pagedData)
            {
                var serviceName = dbcontext.Services.FirstOrDefault(s => s.ServiceId == item.ServiceId)?.ServiceName ?? "N/A";

                var actions = new List<dynamic>
                {
                    new
                    {
                        id = (pageIndex * pageSize) + index + 1,
                        tooltip = item.IsActive ? "Deactivate" : "Activate",
                        color = "#F0C38E",
                        actionFunction = "ToggleWebServiceActivation"
                    }
                };

                data.Add(new
                {
                    sno = (pageIndex * pageSize) + index + 1,
                    servicename = serviceName,
                    webservicename = item.WebServiceName,
                    customActions = actions,
                    webserviceId = item.Id,
                    isActive = item.IsActive
                });

                index++;
            }

            return Json(new
            {
                data,
                columns,
                totalRecords
            });
        }



        [HttpPost]
        public IActionResult ToggleServiceActive([FromForm] IFormCollection form)
        {
            int serviceId = Convert.ToInt32(form["serviceId"].ToString());
            bool active = Convert.ToBoolean(form["active"]);

            _logger.LogInformation($"---------- Service ID: {serviceId}   IS Active: {active}-----------------------");
            var svc = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
            if (svc == null)
                return Json(new { status = false, message = "Not found" });

            svc.Active = active;
            dbcontext.SaveChanges();
            return Json(new { status = true, active = svc.Active });
        }

        [HttpPost]
        [Route("Base/ToggleWebServiceActive")]
        public IActionResult ToggleWebServiceActive([FromForm] IFormCollection form)
        {
            try
            {
                int webserviceId = Convert.ToInt32(form["webserviceId"].ToString());
                bool active = Convert.ToBoolean(form["active"]);

                _logger.LogInformation($"---------- WebService ID: {webserviceId}   Is Active: {active}-----------------------");

                var svc = dbcontext.WebServices.FirstOrDefault(s => s.Id == webserviceId);
                if (svc == null)
                {
                    return Json(new { status = false, message = "Web service not found" });
                }

                if (active)
                {
                    // Check for other active web services for the same ServiceId
                    var otherActiveWebService = dbcontext.WebServices
                        .FirstOrDefault(ws => ws.ServiceId == svc.ServiceId && ws.Id != webserviceId && ws.IsActive);

                    if (otherActiveWebService != null)
                    {
                        var serviceName = dbcontext.Services
                            .FirstOrDefault(s => s.ServiceId == svc.ServiceId)?.ServiceName ?? "Unknown";
                        return Json(new
                        {
                            status = false,
                            message = $"Another web service (ID: {otherActiveWebService.Id}) is already active for service '{serviceName}'. Please deactivate it first."
                        });
                    }
                }

                // Update the requested web service
                svc.IsActive = active;
                svc.UpdatedAt = DateTime.UtcNow.ToString("o");
                dbcontext.SaveChanges();

                return Json(new
                {
                    status = true,
                    active = svc.IsActive,
                    message = $"Web service {(active ? "activated" : "deactivated")} successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling web service activation");
                return Json(new { status = false, message = $"Error toggling web service: {ex.Message}" });
            }
        }

        [HttpGet]
        [Route("Base/GetWebService/{serviceId}")]
        public IActionResult GetWebService(int serviceId)
        {
            try
            {
                var webService = dbcontext.WebServices
                    .FirstOrDefault(ws => ws.ServiceId == serviceId && ws.IsActive);

                if (webService == null)
                {
                    return Json(new { status = false, message = "No configuration found for the specified service" });
                }

                return Json(new
                {
                    status = true,
                    config = new
                    {
                        webService.Id, // Added WebServiceId
                        webService.ServiceId,
                        webService.WebServiceName,
                        webService.ApiEndPoint,
                        webService.OnAction,
                        webService.FieldMappings,
                        webService.CreatedAt,
                        webService.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = $"Error fetching configuration: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("Base/SaveWebService")]
        public IActionResult SaveWebService([FromForm] IFormCollection form)
        {
            try
            {
                var webServiceId = form["webServiceId"].ToString();
                var serviceId = form["serviceId"];
                var webServiceName = form["webServiceName"];
                var apiEndPoint = form["apiEndPoint"].ToString();
                var onAction = form["onAction"].ToString(); // JSON string
                var fieldMappings = form["fieldMappings"].ToString(); // JSON string
                var createdAt = form["createdAt"].ToString();
                var updatedAt = form["updatedAt"].ToString();

                // Validate serviceId
                int parsedWebServiceId = Convert.ToInt32(webServiceId);

                WebService webService;

                // Check if webServiceId is provided and valid
                if (!string.IsNullOrEmpty(webServiceId))
                {
                    // Try to find existing web service by WebServiceId
                    webService = dbcontext.WebServices
                        .FirstOrDefault(ws => ws.Id == parsedWebServiceId && ws.IsActive)!;

                    if (webService != null)
                    {
                        webService.WebServiceName = webServiceName;
                        webService.ApiEndPoint = apiEndPoint;
                        webService.OnAction = onAction;
                        webService.FieldMappings = fieldMappings;
                        webService.UpdatedAt = updatedAt; // Update timestamp
                        // CreatedAt remains unchanged
                    }
                    else
                    {
                        return Json(new { status = false, message = "Web service not found for the provided WebServiceId" });
                    }
                }
                else
                {
                    // Create new web service
                    webService = new WebService
                    {
                        WebServiceName = webServiceName,
                        ApiEndPoint = apiEndPoint,
                        OnAction = onAction,
                        FieldMappings = fieldMappings,
                        CreatedAt = createdAt,
                        UpdatedAt = updatedAt,
                        IsActive = true
                    };
                    dbcontext.WebServices.Add(webService);
                }

                dbcontext.SaveChanges();

                return Json(new
                {
                    status = true,
                    message = webServiceId != "" ? "Web service configuration updated successfully" : "Web service configuration saved successfully",
                    webServiceId = webService.Id,
                });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = "Failed to save configuration", error = ex.Message });
            }
        }
    }
}