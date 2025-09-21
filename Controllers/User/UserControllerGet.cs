using System.Data;
using System.Globalization;
using System.Security.Claims;
using DocumentFormat.OpenXml.Office.CustomUI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SahayataNidhi.Controllers.User
{
    public partial class UserController
    {

        public string? GetSanctionedCorrigendum(dynamic WorkFlow, string id)
        {
            foreach (var item in WorkFlow)
            {
                if ((string)item.status == "sanctioned")
                {
                    return id;
                }
            }

            return null; // Return 0 only if no "sanctioned" status was found
        }

        public IActionResult GetFormFields(string referenceNumber)
        {
            var application = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);
            return Json(new { status = true, formDetails = JsonConvert.DeserializeObject<dynamic>(application!.FormDetails!) });
        }

        [HttpGet]
        public IActionResult GetFormDetails(string applicationId)
        {
            var details = dbcontext.CitizenApplications
                          .FirstOrDefault(ca => ca.ReferenceNumber == applicationId);

            if (details == null)
                return NotFound($"Application ID {applicationId} not found.");

            if (string.IsNullOrWhiteSpace(details.FormDetails))
                return BadRequest("FormDetails is empty.");

            dynamic formDetails;
            try
            {
                formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails)!;
            }
            catch (JsonException)
            {
                return BadRequest("Malformed JSON in FormDetails.");
            }

            if (!string.IsNullOrWhiteSpace(details.AdditionalDetails))
            {
                dynamic additionalDetails;
                try
                {
                    additionalDetails = JsonConvert.DeserializeObject<dynamic>(details.AdditionalDetails)!;
                }
                catch (JsonException)
                {
                    return BadRequest("Malformed JSON in AdditionalDetails.");
                }

                return Json(new { formDetails, additionalDetails });
            }

            return Json(new { formDetails, AdditionalDetails = "" });
        }
        public IActionResult GetInitiatedApplications(int pageIndex = 0, int pageSize = 10)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId))
            {
                return BadRequest("Invalid user ID.");
            }

            // Define SQL parameters
            var UserId = new SqlParameter("@UserId", userId);
            var PageIndex = new SqlParameter("@PageIndex", pageIndex);
            var PageSize = new SqlParameter("@PageSize", pageSize);
            var IsPaginated = new SqlParameter("@IsPaginated", 1);
            var TotalRecords = new SqlParameter("@TotalRecords", SqlDbType.Int) { Direction = ParameterDirection.Output };

            // Execute stored procedure
            var applications = dbcontext.CitizenApplications
                .FromSqlRaw("EXEC GetInitiatedApplications @UserId, @PageIndex, @PageSize, @IsPaginated, @TotalRecords OUTPUT",
                    UserId, PageIndex, PageSize, IsPaginated, TotalRecords)
                .ToList();

            // Retrieve the total record count from the output
            int totalRecords = TotalRecords.Value != DBNull.Value ? Convert.ToInt32(TotalRecords.Value) : 0;

            // Define columns (exclude customActions)
            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey = "sno" },
                new { header = "Service Name", accessorKey = "serviceName" },
                new { header = "Reference Number", accessorKey = "referenceNumber" },
                new { header = "Applicant Name", accessorKey = "applicantName" },
                new { header = "Currently With", accessorKey = "currentlyWith" },
                new { header = "Submission Date", accessorKey = "submissionDate" },
                new { header = "Status", accessorKey = "status" }
            };

            // Initialize data list with embedded actions
            List<dynamic> data = new List<dynamic>();
            int rowIndex = 0; // Use a dedicated variable for row indexing
            Dictionary<string, string> actionMap = new()
            {
                {"pending", "Pending"},
                {"forwarded", "Forwarded"},
                {"sanctioned", "Sanctioned"},
                {"returned", "Returned"},
                {"rejected", "Rejected"},
                {"returntoedit", "Returned to citizen for correction"},
                {"Deposited", "Inserted to Bank File"},
                {"Dispatched", "Payment Under Process"},
                {"Disbursed", "Payment Disbursed"},
                {"Failure", "Payment Failed"},
            };

            foreach (var application in applications)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(application.FormDetails!);
                var officers = JsonConvert.DeserializeObject<JArray>(application.WorkFlow!);
                var currentPlayer = application.CurrentPlayer;
                string officerDesignation = (string)officers![currentPlayer!]!["designation"]!;
                string serviceName = dbcontext.Services.FirstOrDefault(s => s.ServiceId == application.ServiceId)!.ServiceName!;
                var Corrigendum = dbcontext.Corrigenda.Where(co => co.ReferenceNumber == application.ReferenceNumber).ToList();
                List<string> corrigendumIds = [];
                var expiringEligibility = dbcontext.ApplicationsWithExpiringEligibilities.FirstOrDefault(aee => aee.ReferenceNumber == application.ReferenceNumber);

                // Process corrigendum IDs
                int corrigendumIndex = 1; // Separate index for corrigendum actions
                foreach (var item in Corrigendum)
                {
                    string value = GetSanctionedCorrigendum(JsonConvert.DeserializeObject<dynamic>(item.WorkFlow), item.CorrigendumId);
                    if (value != null)
                    {
                        corrigendumIds.Add(value);
                    }
                }

                string officerArea = GetOfficerArea(officerDesignation, formDetails);

                // Define actions for this row
                var actions = new List<dynamic>();
                if ((string)officers![currentPlayer!]!["status"]! != "returntoedit" && (string)officers[currentPlayer!]!["status"]! != "sanctioned")
                {
                    actions.Add(new { tooltip = "View", color = "#F0C38E", actionFunction = "CreateTimeLine" });
                }
                else if ((string)officers[currentPlayer!]!["status"]! == "sanctioned")
                {
                    actions.Add(new { tooltip = "View", color = "#F0C38E", actionFunction = "CreateTimeLine" });
                    actions.Add(new { tooltip = "Download SL", color = "#F0C38E", actionFunction = "DownloadSanctionLetter" });
                    foreach (string id in corrigendumIds)
                    {
                        actions.Add(new { tooltip = "Download CRG " + corrigendumIndex, corrigendumId = id, color = "#F0C38E", actionFunction = "DownloadCorrigendum" });
                        corrigendumIndex++;
                    }
                }
                else
                {
                    actions.Add(new { tooltip = "Edit Form", color = "#F0C38E", actionFunction = "EditForm" });
                }

                if (expiringEligibility != null && !string.IsNullOrWhiteSpace(expiringEligibility.ExpirationDate))
                {
                    // Check if there is any "Initiated" corrigendum for this reference
                    bool hasInitiatedCorrection = dbcontext.Corrigenda
                        .Any(co => co.ReferenceNumber == application.ReferenceNumber && co.Status == "Initiated");

                    _logger.LogInformation(
                        $"----------- Initiated Corrigendum Exists: {hasInitiatedCorrection} for Ref#: {application.ReferenceNumber} ------------------");

                    // Only proceed if there is NO initiated corrigendum
                    if (!hasInitiatedCorrection && DateTime.TryParse(expiringEligibility.ExpirationDate, out DateTime expirationDate))
                    {
                        int daysLeft = (expirationDate - DateTime.Today).Days;
                        bool isExpiringSoon = daysLeft >= 0 && daysLeft <= 90;
                        if (isExpiringSoon && application.Status == "Sanctioned")
                        {
                            actions.Clear();
                            actions.Add(new
                            {
                                tooltip = "Update PCP UDID Card",
                                tooltipText = "To update UDID Card as its validity is expiring soon",
                                color = "#F0C38E",
                                actionFunction = "UpdateExpiringDocument"
                            });
                        }
                    }
                }

                // Add data object with embedded actions
                data.Add(new
                {
                    sno = (pageIndex * pageSize) + rowIndex + 1, // Correct S.No calculation
                    serviceName,
                    referenceNumber = application.ReferenceNumber,
                    applicantName = GetFieldValue("ApplicantName", formDetails),
                    currentlyWith = officerDesignation + " " + officerArea,
                    status = actionMap[(string)officers[currentPlayer!]!["status"]!],
                    submissionDate = DateTime.TryParse(application.CreatedAt, out var createdAt)
                    ? createdAt.ToString("dd MMM yyyy")
                    : "",
                    serviceId = application.ServiceId,
                    customActions = actions // Embed actions here
                });

                rowIndex++; // Increment row index for S.No
            }

            // ✅ Sort by submissionDate (latest first) with proper parsing
            data = data
                .OrderByDescending(d =>
                {
                    DateTime parsedDate;
                    return DateTime.TryParseExact(
                        d.submissionDate?.ToString(),
                        "dd MMM yyyy hh:mm:ss tt",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out parsedDate
                    ) ? parsedDate : DateTime.MinValue;
                })
                .ToList();


            return Json(new { data, columns, totalRecords });
        }
        public IActionResult IncompleteApplications(int pageIndex = 0, int pageSize = 10)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // Ensure that you filter by the correct "Initiated" status
            var applications = dbcontext.CitizenApplications
                                        .Where(u => u.CitizenId.ToString() == userIdClaim && u.Status == "Incomplete")
                                        .ToList();

            var totalRecords = applications.Count;

            var pagedApplications = applications
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();

            // Initialize columns
            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey = "sno" },
                new { header = "Reference Number", accessorKey = "referenceNumber" },
                new { header = "Save Date", accessorKey = "saveDate" },
            };

            // Correctly initialize data list
            List<dynamic> data = [];
            int index = 0;


            foreach (var application in pagedApplications)
            {
                List<dynamic> actions = [];
                var formDetails = JsonConvert.DeserializeObject<dynamic>(application.FormDetails!);
                actions.Add(new { id = (pageIndex * pageSize) + index + 1, tooltip = "Edit", color = "#F0C38E", actionFunction = "IncompleteForm" });
                data.Add(new
                {
                    sno = (pageIndex * pageSize) + index + 1,
                    referenceNumber = application.ReferenceNumber,
                    serviceId = application.ServiceId,
                    saveDate = application.CreatedAt,
                    customActions = actions
                });
                index++;
            }

            // Ensure size is positive for pagination
            return Json(new { data, columns, totalRecords });
        }
        [HttpGet]
        public async Task<IActionResult> GetApplicationHistory(string ApplicationId, int page, int size)
        {
            if (string.IsNullOrEmpty(ApplicationId))
            {
                return BadRequest("ApplicationId is required.");
            }

            var parameter = new SqlParameter("@ApplicationId", ApplicationId);
            var application = await dbcontext.CitizenApplications.FirstOrDefaultAsync(ca => ca.ReferenceNumber == ApplicationId);
            var players = JsonConvert.DeserializeObject<dynamic>(application!.WorkFlow!) as JArray;
            int currentPlayerIndex = (int)application.CurrentPlayer!;
            var currentPlayer = players!.FirstOrDefault(o => (int)o["playerId"]! == currentPlayerIndex);
            var history = await dbcontext.ActionHistories.Where(ah => ah.ReferenceNumber == ApplicationId && !ah.ActionTaken.Contains("Withheld")).ToListAsync();
            var formDetails = JsonConvert.DeserializeObject<dynamic>(application.FormDetails!);
            int totalRecords = history.Count;

            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey="sno" },
                new { header = "Action Taker", accessorKey="actionTaker" },
                new { header = "Action Taken",accessorKey="actionTaken" },
                new { header = "Remarks", accessorKey="remarks" },
                new { header = "Action Taken On",accessorKey="actionTakenOn" },
            };
            int index = 1;
            List<dynamic> data = [];
            foreach (var item in history)
            {
                string officerArea = GetOfficerAreaForHistory(item.LocationLevel!, item.LocationValue);

                data.Add(new
                {
                    sno = index,
                    actionTaker = item.ActionTaker != "Citizen" ? item.ActionTaker + " " + officerArea : item.ActionTaker,
                    actionTaken = item.ActionTaken! == "ReturnToCitizen" ? "Returned to citizen for correction" : item.ActionTaken,
                    remarks = item.Remarks,
                    actionTakenOn = item.ActionTakenDate,
                });
                index++;
            }

            if ((string)currentPlayer!["status"]! == "pending")
            {
                string designation = (string)currentPlayer["designation"]!;
                string officerArea = GetOfficerArea(designation, formDetails);
                data.Add(new
                {
                    sno = index,
                    actionTaker = currentPlayer["designation"] + " " + officerArea,
                    actionTaken = currentPlayer["status"],
                    actionTakenOn = "",
                });
                totalRecords++;
            }

            return Json(new { data, columns, totalRecords, customActions = new { } });
        }
        public IActionResult GetServices(int pageIndex = 0, int pageSize = 10)
        {
            // Fetch and materialize all active services
            var services = dbcontext.Services
                .FromSqlRaw("SELECT * FROM Services WHERE Active=1")
                .ToList();

            var totalCount = services.Count;

            // Apply pagination
            var pagedServices = services
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();

            _logger.LogInformation($"----------SERVICES COUNT: {totalCount}---------------------------");

            // Define table columns
            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey = "sno" },
                new { header = "Service Name", accessorKey = "servicename" },
                new { header = "Department", accessorKey = "department" }
            };

            // Prepare paginated data with embedded customActions
            List<dynamic> data = [];
            int index = 0;

            foreach (var item in pagedServices)
            {
                int serialNo = (pageIndex * pageSize) + index + 1;
                var department = dbcontext.Departments.FirstOrDefault(d => d.DepartmentId == item.DepartmentId)?.DepartmentName ?? "N/A";

                var row = new
                {
                    sno = serialNo,
                    servicename = item.ServiceName,
                    department = department,
                    serviceId = item.ServiceId,
                    customActions = new List<dynamic>
                {
                    new
                    {
                        tooltip = "Apply",
                        color = "#F0C38E",
                        actionFunction = "OpenForm",
                        parameters = new[] { item.ServiceId }
                    }
                }
                };

                data.Add(row);
                index++;
            }

            return Json(new
            {
                status = true,
                data,
                columns,
                totalCount
            });
        }
        [HttpGet]
        public dynamic? GetUserDetails()
        {
            // Retrieve userId from JWT token
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userId == null)
            {
                return null; // Handle case where userId is not available
            }

            int initiated = dbcontext.CitizenApplications
                .Where(u => u.CitizenId.ToString() == userId && u.Status != "Incomplete")
                .Count();
            int incomplete = dbcontext.CitizenApplications
                .Where(u => u.CitizenId.ToString() == userId && u.Status == "Incomplete")
                .Count();

            var userDetails = dbcontext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);

            var details = new
            {
                userDetails!.Name,
                userDetails.Username,
                userDetails.Profile,
                userDetails.Email,
                userDetails.MobileNumber,
                userDetails.BackupCodes,
                initiated,
                incomplete,
            };

            return details;
        }

        [HttpGet]
        public async Task<IActionResult> DownloadSanctionLetter(string fileName)
        {
            var userId = Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            try
            {
                var sanctionLetter = await dbcontext.UserDocuments
                    .FirstOrDefaultAsync(sl => sl.FileName == fileName);
                if (sanctionLetter == null)
                    return NotFound($"Sanction letter for FileName {fileName} not found.");

                // Log the download action
                _auditService.InsertLog(HttpContext, "Download File", "Sanction Letter downloaded successfully.", userId, "Success");

                // Return the file
                return File(sanctionLetter.FileData, "application/pdf", sanctionLetter.FileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while downloading the sanction letter. {ex}");
            }
        }

        [HttpGet]
        public IActionResult GetAcknowledgement(string ApplicationId)
        {
            string fileName = ApplicationId.Replace("/", "_") + "Acknowledgement.pdf";

            string fullPath = "Base/DisplayFile?filename=" + fileName;

            return Json(new { fullPath });
        }

        [HttpGet]
        public IActionResult GetExpiringDocumentDetails(string ServiceId, string referenceNumber)
        {
            // Validate ServiceId
            if (!int.TryParse(ServiceId, out int serviceId))
            {
                _logger.LogError($"Invalid ServiceId: {ServiceId}");
                return Json(new { status = false, message = "Invalid ServiceId. Must be a valid integer." });
            }

            // Retrieve service
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
            if (service == null)
            {
                _logger.LogError($"Service not found for ServiceId: {serviceId}");
                return Json(new { status = false, message = "Service not found." });
            }

            // Validate referenceNumber
            var application = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);
            if (application == null)
            {
                _logger.LogError($"Application not found for ReferenceNumber: {referenceNumber}");
                return Json(new { status = false, message = "Application not found." });
            }

            try
            {
                // Parse FormElement JSON
                var formElementObj = JArray.Parse(service.FormElement!);
                if (formElementObj == null || !formElementObj.Any())
                {
                    _logger.LogError($"FormElement is empty or invalid for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "FormElement is empty or invalid." });
                }

                // Find Pension Type section
                var pensionTypeSection = formElementObj.FirstOrDefault(s => s["section"]?.ToString() == "Pension Type");
                if (pensionTypeSection == null)
                {
                    _logger.LogError($"Pension Type section not found in FormElement for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "Pension Type section not found." });
                }

                // Find PensionType field
                var fieldsArray = pensionTypeSection["fields"] as JArray;
                if (fieldsArray == null)
                {
                    _logger.LogError($"No fields found in Pension Type section for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "No fields found in Pension Type section." });
                }

                var pensionTypeField = fieldsArray.FirstOrDefault(f => f["name"]?.ToString().Trim() == "PensionType");
                if (pensionTypeField == null)
                {
                    _logger.LogError($"PensionType field not found in Pension Type section for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "PensionType field not found." });
                }

                // Verify PHYSICALLY CHALLENGED PERSON option
                bool hasPhysicallyChallengedOption = (pensionTypeField["options"] as JArray)?
                    .Any(o => o["value"]?.ToString().Trim() == "PHYSICALLY CHALLENGED PERSON") ?? false;
                if (!hasPhysicallyChallengedOption)
                {
                    _logger.LogError($"PHYSICALLY CHALLENGED PERSON option not found in PensionType for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "PHYSICALLY CHALLENGED PERSON option not found." });
                }

                // Get additionalFields for PHYSICALLY CHALLENGED PERSON
                var additionalFields = pensionTypeField["additionalFields"]?["PHYSICALLY CHALLENGED PERSON"]?.ToObject<JArray>();
                if (additionalFields == null)
                {
                    _logger.LogError($"No additionalFields for PHYSICALLY CHALLENGED PERSON in ServiceId: {serviceId}");
                    return Json(new { status = false, message = "No additional fields for PHYSICALLY CHALLENGED PERSON." });
                }

                // Find KindOfDisability field
                var kindOfDisabilityField = additionalFields.FirstOrDefault(f => f["name"]?.ToString() == "KindOfDisability");
                if (kindOfDisabilityField == null)
                {
                    _logger.LogError($"KindOfDisability field not found in PHYSICALLY CHALLENGED PERSON additionalFields for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "KindOfDisability field not found." });
                }

                // Verify TEMPORARY option
                bool hasTemporaryOption = (kindOfDisabilityField["options"] as JArray)?
                    .Any(o => o["value"]?.ToString().Trim() == "TEMPORARY") ?? false;
                if (!hasTemporaryOption)
                {
                    _logger.LogError($"TEMPORARY option not found in KindOfDisability for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "TEMPORARY option not found in KindOfDisability." });
                }

                // Get additionalFields for TEMPORARY
                var temporaryAdditionalFields = kindOfDisabilityField["additionalFields"]?["TEMPORARY"]?.ToObject<JArray>();
                if (temporaryAdditionalFields == null)
                {
                    _logger.LogError($"No additionalFields for TEMPORARY in KindOfDisability for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "No additional fields for TEMPORARY in KindOfDisability." });
                }

                // Extract fields from PHYSICALLY CHALLENGED PERSON additionalFields
                var udidCardNumberField = additionalFields.FirstOrDefault(f => f["name"]?.ToString() == "UdidCardNumber");
                var udidCardIssueDateField = additionalFields.FirstOrDefault(f => f["name"]?.ToString() == "UdidCardIssueDate");
                var percentageOfDisabilityField = additionalFields.FirstOrDefault(f => f["name"]?.ToString() == "PercentageOfDisability");
                var ifTemporaryDisabilityUdidCardValidUptoField = temporaryAdditionalFields
                    .FirstOrDefault(f => f["name"]?.ToString() == "IfTemporaryDisabilityUdidCardValidUpto");

                // Find Documents section
                var documentsSection = formElementObj.FirstOrDefault(s => s["section"]?.ToString() == "Documents");
                if (documentsSection == null)
                {
                    _logger.LogError($"Documents section not found in FormElement for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "Documents section not found." });
                }

                // Find UdidCard field in Documents section
                var documentFieldsArray = documentsSection["fields"] as JArray;
                if (documentFieldsArray == null)
                {
                    _logger.LogError($"No fields found in Documents section for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "No fields found in Documents section." });
                }

                var udidCardField = documentFieldsArray.FirstOrDefault(f => f["name"]?.ToString() == "UdidCard");
                if (udidCardField == null)
                {
                    _logger.LogError($"UdidCard field not found in Documents section for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "UdidCard field not found." });
                }

                // Verify UdidCard is dependent on KindOfDisability with TEMPORARY
                bool isDependentEnclosure = udidCardField["isDependentEnclosure"]?.ToObject<bool>() ?? false;
                var dependentField = udidCardField["dependentField"]?.ToString();
                var dependentValues = udidCardField["dependentValues"]?.ToObject<string[]>();
                if (!isDependentEnclosure || dependentField != "KindOfDisability" || dependentValues == null || !dependentValues.Contains("TEMPORARY"))
                {
                    _logger.LogError($"UdidCard is not correctly configured as a dependent enclosure for KindOfDisability with TEMPORARY for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "UdidCard is not correctly configured as a dependent enclosure." });
                }

                // Validate required fields
                if (udidCardNumberField == null || udidCardIssueDateField == null ||
                    percentageOfDisabilityField == null || ifTemporaryDisabilityUdidCardValidUptoField == null ||
                    udidCardField == null)
                {
                    _logger.LogError($"One or more required fields (UdidCardNumber, UdidCardIssueDate, PercentageOfDisability, IfTemporaryDisabilityUdidCardValidUpto, UdidCard) not found for ServiceId: {serviceId}");
                    return Json(new { status = false, message = "One or more required fields not found in form elements." });
                }

                // Return the required field definitions
                return Json(new
                {
                    status = true,
                    data = new
                    {
                        UdidCardNumber = udidCardNumberField,
                        UdidCardIssueDate = udidCardIssueDateField,
                        PercentageOfDisability = percentageOfDisabilityField,
                        kindOfDisabilityField = kindOfDisabilityField,
                        IfTemporaryDisabilityUdidCardValidUpto = ifTemporaryDisabilityUdidCardValidUptoField,
                        UdidCard = udidCardField
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing FormElement for ServiceId: {serviceId}, ReferenceNumber: {referenceNumber}");
                return Json(new { status = false, message = "An error occurred while processing the request." });
            }
        }
        [HttpGet]
        public IActionResult GetIfSameUdidNumber(string referenceNumber, string udidNumber)
        {
            var application = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);
            var formDetails = JToken.Parse(application!.FormDetails!);
            var UdidNumber = FindFieldRecursively(formDetails, "UdidCardNumber");
            if (udidNumber == (string)UdidNumber!["value"]!)
            {
                return Json(new { status = true });
            }
            return Json(new { status = false, message = "Udid Number doesn't match the existing one in the record." });
        }
    }
}