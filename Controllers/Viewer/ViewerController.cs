using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers.Officer
{
    [Authorize(Roles = "Viewer")]
    public partial class ViewerController(SwdjkContext dbcontext, ILogger<ViewerController> logger,
        UserHelperFunctions helper) : Controller
    {
        protected readonly SwdjkContext dbcontext = dbcontext;
        protected readonly ILogger<ViewerController> _logger = logger;
        protected readonly UserHelperFunctions helper = helper;

        public override void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);

            // Replace session handling with JWT claims
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var officer = dbcontext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
            string profile = officer?.Profile ?? "/resources/dummyDocs/formImage.jpg";

            ViewData["UserType"] = "Officer";
            ViewData["UserName"] = officer?.Username;
            ViewData["Profile"] = string.IsNullOrEmpty(profile) ? "/resources/dummyDocs/formImage.jpg" : profile;
        }

        public class PensionTypeCount
        {
            public string? PensionType { get; set; }
            public int Count { get; set; }
        }

        public class LocationCount
        {
            public int LocationId { get; set; }
            public string? LocationName { get; set; }
            public int Count { get; set; }
        }

        public IActionResult GetApplicationStatus(string serviceId, string? division = null, string? district = null, string? tehsil = null)
        {
            string accessLevel;
            object? accessCode = DBNull.Value;
            object? divisionCode = DBNull.Value;

            // Pick correct access level
            if (!string.IsNullOrWhiteSpace(tehsil))
            {
                accessLevel = "Tehsil";
                accessCode = int.TryParse(tehsil, out var tehsilVal) ? tehsilVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(district))
            {
                accessLevel = "District";
                accessCode = int.TryParse(district, out var districtVal) ? districtVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(division))
            {
                accessLevel = "Division";
                accessCode = int.TryParse(division, out var divisionVal) ? divisionVal : DBNull.Value;
                divisionCode = accessCode; // For compatibility with GetMainApplicationStatusCount
            }
            else
            {
                accessLevel = "State";
            }

            var parameters = new List<SqlParameter>
            {
                new("@ServiceId", SqlDbType.Int) { Value = int.Parse(serviceId) },
                new("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new("@AccessCode", SqlDbType.Int) { Value = accessCode ?? DBNull.Value },
                new("@TakenBy", SqlDbType.VarChar) { Value = DBNull.Value }, // Always NULL
                new("@DivisionCode", SqlDbType.Int) { Value = divisionCode ?? DBNull.Value }
            };

            // Fetch main application status counts
            var counts = dbcontext.Database
                .SqlQueryRaw<MainStatusCounts>(
                    "EXEC GetMainApplicationStatusCount @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode",
                    parameters.ToArray()
                )
                .AsEnumerable()
                .FirstOrDefault() ?? new MainStatusCounts();

            // Define application status data
            var dataList = new List<dynamic>
            {
                new
                {
                    title = "Applications Received",
                    value = counts.TotalApplications.ToString("N0"),
                    category = "application",
                    color = "primary",
                    bgColor = "#1F43B4",
                    gradientStart = "#4f46e5",
                    gradientEnd = "#3b82f6",
                },
                new
                {
                    title = "Sanctioned",
                    value = counts.SanctionedCount.ToString("N0"),
                    category = "application",
                    color = "success",
                    bgColor = "#4CAF50",
                    gradientStart = "#059669",
                    gradientEnd = "#10b981",
                },
                new
                {
                    title = "Under Process",
                    value = counts.PendingCount.ToString("N0"),
                    category = "application",
                    color = "warning",
                    bgColor = "#E4630A",
                    gradientStart = "#f59e0b",
                    gradientEnd = "#fbbf24",
                },
                new
                {
                    title = "Pending with Citizen",
                    value = counts.ReturnToEditCount.ToString("N0"),
                    category = "application",
                    color = "info",
                    bgColor = "#2561E8",
                    gradientStart = "#0ea5e9",
                    gradientEnd = "#38bdf8",
                },
                new
                {
                    title = "Rejected",
                    value = counts.RejectCount.ToString("N0"),
                    category = "application",
                    color = "error",
                    bgColor = "#F44336",
                    gradientStart = "#ef4444",
                    gradientEnd = "#f87171",
                }
            };

            // Define possible pension categories (matching the React dashboard's categoryData)
            var pensionCategories = new List<dynamic>
            {
                new { Category = "OLD AGE PENSION", Color = "#4f46e5" }, // Changed to match DB
                new { Category = "WOMEN IN DISTRESS", Color = "#059669" }, // Changed to match DB  
                new { Category = "PHYSICALLY CHALLENGED PERSON", Color = "#f59e0b" }, // Already correct
                new { Category = "TRANSGENDER", Color = "#0ea5e9" } // Changed to match DB
            };

            // Create DataTable for CategoryList table-valued parameter
            var categoryTable = new DataTable();
            categoryTable.Columns.Add("Category", typeof(string));
            foreach (var category in pensionCategories)
            {
                categoryTable.Rows.Add(category.Category);
            }

            // Parameters for GetCategoryCountsFromJson
            var categoryParams = new[]
            {
                new SqlParameter("@JsonKey", SqlDbType.NVarChar) { Value = "PensionType" },
                new SqlParameter("@JsonPath", SqlDbType.NVarChar) { Value = @"$.""Pension Type""" }, // Removed [0].value
                new SqlParameter("@Categories", SqlDbType.Structured) { Value = categoryTable, TypeName = "CategoryList" },
                new SqlParameter("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new SqlParameter("@AccessCode", SqlDbType.Int) { Value = accessCode ?? DBNull.Value },
                new SqlParameter("@DivisionCode", SqlDbType.Int) { Value = divisionCode ?? DBNull.Value }
            };

            // Fetch pension type counts
            var pensionTypeCounts = dbcontext.Database
                .SqlQueryRaw<PensionTypeCount>(
                    "EXEC GetCategoryCountsFromJson @JsonKey, @JsonPath, @Categories, @AccessLevel, @AccessCode, @DivisionCode",
                    categoryParams
                )
                .ToList();

            // Map pension type counts to the format expected by the React dashboard
            var categoryData = pensionCategories
                .GroupJoin(pensionTypeCounts,
                    cat => cat.Category,
                    count => count.PensionType,
                    (cat, counts) => new
                    {
                        name = cat.Category,
                        value = counts.FirstOrDefault()?.Count ?? 0,
                        color = cat.Color
                    })
                .ToList();

            // Parameters for GetLocationWiseSanctionedCounts
            var locationParams = new List<SqlParameter>
            {
                new("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new("@AccessCode", SqlDbType.Int) { Value = accessCode ?? DBNull.Value },
                new("@DivisionCode", SqlDbType.Int) { Value = divisionCode ?? DBNull.Value },
                new("@ServiceId", SqlDbType.Int) { Value = int.Parse(serviceId) }
            };

            // Fetch location-wise sanctioned counts
            var locationCounts = dbcontext.Database
                .SqlQueryRaw<LocationCount>(
                    "EXEC GetLocationWiseSanctionedCounts @AccessLevel, @AccessCode, @DivisionCode, @ServiceId",
                    locationParams.ToArray()
                )
                .ToList();

            // Define a color palette for locations
            var locationColors = new[] { "#4f46e5", "#059669", "#f59e0b", "#0ea5e9", "#ef4444", "#3b82f6", "#10b981", "#fbbf24", "#38bdf8", "#f87171" };

            // Map location counts to the format expected by the React dashboard
            var locationData = locationCounts
                .Select((loc, index) => new
                {
                    name = loc.LocationName,
                    value = loc.Count,
                    color = locationColors[index % locationColors.Length]
                })
                .ToList();

            return Json(new { dataList, categoryData, locationData });
        }

        public class AadhaarValidationCount
        {
            public int TotalSanctioned { get; set; }
            public int AadhaarValidated { get; set; }
            public int AadhaarNotValidated { get; set; }
        }

        public IActionResult GetAadhaarValidationCount(string serviceId, string? division = null, string? district = null, string? tehsil = null)
        {
            string accessLevel;
            object? accessCode = DBNull.Value;
            object? divisionCode = DBNull.Value;

            // Pick correct access level
            if (!string.IsNullOrWhiteSpace(tehsil))
            {
                accessLevel = "Tehsil";
                accessCode = int.TryParse(tehsil, out var tehsilVal) ? tehsilVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(district))
            {
                accessLevel = "District";
                accessCode = int.TryParse(district, out var districtVal) ? districtVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(division))
            {
                accessLevel = "Division";
                accessCode = int.TryParse(division, out var divisionVal) ? divisionVal : DBNull.Value;
                divisionCode = accessCode; // For compatibility with SQL proc
            }
            else
            {
                accessLevel = "State";
            }

            var parameters = new List<SqlParameter>
            {
                new("@ServiceId", SqlDbType.Int) { Value = int.Parse(serviceId) },
                new("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new("@AccessCode", SqlDbType.Int) { Value = accessCode ?? DBNull.Value },
                new("@DivisionCode", SqlDbType.Int) { Value = divisionCode ?? DBNull.Value },
                new("@AadhaarFilter", SqlDbType.VarChar) { Value = DBNull.Value } // null by default
            };

            // Fetch Aadhaar validation counts
            var counts = dbcontext.Database
                .SqlQueryRaw<AadhaarValidationCount>(
                    "EXEC GetAadhaarValidationCount @AccessLevel, @AccessCode, @ServiceId, @DivisionCode, @AadhaarFilter",
                    parameters.ToArray()
                )
                .AsEnumerable()
                .FirstOrDefault() ?? new AadhaarValidationCount();

            // Define application status data
            var dataList = new List<dynamic>
    {
        new
        {
            title = "Total Sanctioned",
            value = counts.TotalSanctioned.ToString("N0"),
            category = "application",
            color = "primary",
            bgColor = "#f8faff",
            gradientStart = "#4f46e5",
            gradientEnd = "#3b82f6",
        },
        new
        {
            title = "Aadhaar Validated",
            value = counts.AadhaarValidated.ToString("N0"),
            category = "application",
            color = "success",
            bgColor = "#f0fdf4",
            gradientStart = "#059669",
            gradientEnd = "#10b981",
        },
        new
        {
            title = "Aadhaar Not Validated",
            value = counts.AadhaarNotValidated.ToString("N0"),
            category = "application",
            color = "warning",
            bgColor = "#fffbeb",
            gradientStart = "#f59e0b",
            gradientEnd = "#fbbf24",
        },
    };

            return Json(new { dataList });
        }

        public IActionResult GetAadhaarValidationData(string serviceId, string type, int pageIndex = 0, int pageSize = 10, string state = "0", string? division = null, string? district = null, string? tehsil = null)
        {
            // Determine AccessLevel and AccessCode based on filters
            string accessLevel;
            object accessCode = DBNull.Value;
            object divisionCode = DBNull.Value;

            if (!string.IsNullOrWhiteSpace(tehsil))
            {
                accessLevel = "Tehsil";
                accessCode = int.TryParse(tehsil, out var tehsilVal) ? tehsilVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(district))
            {
                accessLevel = "District";
                accessCode = int.TryParse(district, out var districtVal) ? districtVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(division))
            {
                accessLevel = "Division";
                accessCode = int.TryParse(division, out var divisionVal) ? divisionVal : DBNull.Value;
                divisionCode = accessCode;
            }
            else
            {
                accessLevel = "State";
                accessCode = state == "0" ? 0 : DBNull.Value; // Assuming "0" represents Jammu & Kashmir
            }

            // Validate AccessLevel and AccessCode
            if ((accessLevel == "Tehsil" || accessLevel == "District") && accessCode == DBNull.Value)
            {
                return BadRequest("Invalid AccessCode for the specified AccessLevel.");
            }
            if (accessLevel == "Division" && divisionCode == DBNull.Value)
            {
                return BadRequest("Invalid DivisionCode for Division AccessLevel.");
            }

            // Parameters for GetMainApplicationStatusData
            var parameters = new List<SqlParameter>
            {
                new("@ServiceId", SqlDbType.Int) { Value = int.Parse(serviceId) },
                new("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new("@AccessCode", SqlDbType.Int) { Value = accessCode },
                new("@DivisionCode", SqlDbType.Int) { Value = divisionCode },
                new("@AadhaarFilter", SqlDbType.VarChar) { Value = (object)(type == "sanctioned" ? null : type)! ?? DBNull.Value },
                new("@PageIndex", SqlDbType.Int) { Value = pageIndex },
                new("@PageSize", SqlDbType.Int) { Value = pageSize },
                new("@IsPaginated", SqlDbType.Bit) { Value = 1 },
                new("@TotalRecords", SqlDbType.Int) { Direction = ParameterDirection.Output }
            };

            // Fetch application data
            var response = dbcontext.CitizenApplications
                .FromSqlRaw(
                    "EXEC GetAadhaarValidationData @AccessLevel, @AccessCode, @ServiceId, @DivisionCode, @AadhaarFilter, @PageIndex, @PageSize, @IsPaginated, @TotalRecords OUTPUT",
                    parameters.ToArray()
                )
                .ToList();

            int totalRecords = (int)parameters.Find(p => p.ParameterName == "@TotalRecords")!.Value;

            // Fetch service details for serviceName
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == int.Parse(serviceId));
            if (service == null)
            {
                return NotFound();
            }

            // Columns for the table
            List<dynamic> columns =
            [
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "serviceName", header = "Service Name" },
                new { accessorKey = "status", header = "Application Status" },
                new { accessorKey = "submissionDate", header = "Submission Date" }
            ];

            List<dynamic> data = [];

            // Start numbering based on pagination
            int snoCounter = (pageIndex * pageSize) + 1;

            foreach (var details in response)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails!);
                string serviceName = service.ServiceName!;
                string status = details.Status!; // Use WorkflowStatus from stored procedure

                var applicationObject = new
                {
                    sno = snoCounter++,
                    referenceNumber = details.ReferenceNumber,
                    applicantName = GetFieldValue("ApplicantName", formDetails),
                    submissionDate = details.CreatedAt,
                    serviceName,
                    status,
                    serviceId = details.ServiceId
                };

                data.Add(applicationObject);
            }

            return Json(new
            {
                data,
                columns,
                totalRecords
            });
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

        public string GetOfficerArea(string accessLevel, dynamic formDetails)
        {

            int accessCode;

            switch (accessLevel)
            {
                case "Tehsil":
                    accessCode = Convert.ToInt32(GetFieldValue("Tehsil", formDetails));
                    var tehsil = dbcontext.Tswotehsil.FirstOrDefault(t => t.TehsilId == accessCode);
                    return tehsil?.TehsilName ?? string.Empty;

                case "District":
                    accessCode = Convert.ToInt32(GetFieldValue("District", formDetails));
                    var district = dbcontext.District.FirstOrDefault(d => d.DistrictId == accessCode);
                    return district?.DistrictName ?? string.Empty;

                case "Division":
                    accessCode = Convert.ToInt32(GetFieldValue("District", formDetails));
                    var districtForDivision = dbcontext.District.FirstOrDefault(d => d.DistrictId == accessCode);
                    if (districtForDivision == null)
                        return string.Empty;
                    return districtForDivision.Division == 1 ? "Jammu" : "Kashmir";
                case "State":
                    return "J&K";
                default:
                    return string.Empty;
            }
        }



        public IActionResult GetMainApplicationStatusData(string serviceId, string type, int pageIndex = 0, int pageSize = 10, string state = "0", string? division = null, string? district = null, string? tehsil = null)
        {
            // === Determine AccessLevel and AccessCode ===
            string accessLevel;
            object accessCode = DBNull.Value;
            object divisionCode = DBNull.Value;

            if (!string.IsNullOrWhiteSpace(tehsil))
            {
                accessLevel = "Tehsil";
                accessCode = int.TryParse(tehsil, out var tehsilVal) ? tehsilVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(district))
            {
                accessLevel = "District";
                accessCode = int.TryParse(district, out var districtVal) ? districtVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(division))
            {
                accessLevel = "Division";
                accessCode = int.TryParse(division, out var divisionVal) ? divisionVal : DBNull.Value;
                divisionCode = accessCode;
            }
            else
            {
                accessLevel = "State";
                accessCode = state == "0" ? 0 : DBNull.Value;
            }

            // === Validation ===
            if ((accessLevel == "Tehsil" || accessLevel == "District") && accessCode == DBNull.Value)
                return BadRequest("Invalid AccessCode for the specified AccessLevel.");

            if (accessLevel == "Division" && divisionCode == DBNull.Value)
                return BadRequest("Invalid DivisionCode for Division AccessLevel.");

            // === Execute Stored Procedure ===
            var parameters = new List<SqlParameter>
            {
                new("@ServiceId", SqlDbType.Int) { Value = int.Parse(serviceId) },
                new("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new("@AccessCode", SqlDbType.Int) { Value = accessCode },
                new("@DivisionCode", SqlDbType.Int) { Value = divisionCode },
                new("@ApplicationStatus", SqlDbType.VarChar) { Value = type == "total" ? DBNull.Value : type },
                new("@PageIndex", SqlDbType.Int) { Value = pageIndex },
                new("@PageSize", SqlDbType.Int) { Value = pageSize },
                new("@IsPaginated", SqlDbType.Bit) { Value = 1 },
                new("@TotalRecords", SqlDbType.Int) { Direction = ParameterDirection.Output }
            };

            // First, let's check what the stored procedure returns
            var response = dbcontext.Database
                .SqlQueryRaw<MainApplicationStatusDto>(
                    "EXEC GetMainApplicationStatusData @AccessLevel, @AccessCode, @ServiceId, @DivisionCode, @ApplicationStatus, @PageIndex, @PageSize, @IsPaginated, @TotalRecords OUTPUT",
                    parameters.ToArray())
                .ToList();

            int totalRecords = (int)parameters.First(p => p.ParameterName == "@TotalRecords").Value;

            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == int.Parse(serviceId));
            if (service == null) return NotFound("Service not found.");

            string serviceName = service.ServiceName!;

            // === Decide whether to show "Sanction Date" column ===
            bool showSanctionDateColumn = type == "sanctioned" ||
                                          (type == "total" && response.Any(x => x.Status == "Sanctioned"));

            // === Build Columns with Location Columns ===
            var columns = new List<object>
            {
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "referenceNumber", header = "Reference Number" }
            };

            // Add location columns based on access level
            if (accessLevel == "State")
            {
                columns.Insert(1, new { accessorKey = "divisionName", header = "Division Name" });
                columns.Insert(2, new { accessorKey = "districtName", header = "District Name" });
            }
            else if (accessLevel == "Division")
            {
                columns.Insert(1, new { accessorKey = "districtName", header = "District Name" });
                columns.Insert(2, new { accessorKey = "tehsilName", header = "Tehsil Name" });
            }
            else if (accessLevel == "District")
            {
                columns.Insert(1, new { accessorKey = "tehsilName", header = "Tehsil Name" });
            }
            // Note: For Tehsil level, no additional location columns needed as per your logic

            // Add the rest of the columns
            columns.Add(new { accessorKey = "applicantName", header = "Applicant Name" });
            columns.Add(new { accessorKey = "serviceName", header = "Service Name" });
            columns.Add(new { accessorKey = "currentlyWith", header = "Currently With" });
            columns.Add(new { accessorKey = "status", header = "Application Status" });
            columns.Add(new { accessorKey = "submissionDate", header = "Submission Date" });

            if (showSanctionDateColumn)
            {
                columns.Add(new { accessorKey = "sanctionDate", header = "Sanction Date" });
            }

            // === Build Data ===
            var data = new List<Dictionary<string, object>>();
            int sno = pageIndex * pageSize + 1;

            foreach (var details in response)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails ?? "{}");
                string applicantName = GetFieldValue("ApplicantName", formDetails);
                string status = details.Status == "Initiated" ? "Under Process" : details.Status ?? "Under Process";
                string? submissionDate = details.Created_at;
                var officers = JsonConvert.DeserializeObject<JArray>(details.WorkFlow!);
                var currentPlayer = details.CurrentPlayer;
                string officerDesignation = (string)officers![currentPlayer!]!["designation"]!;
                string offierAccessLevel = (string)officers![currentPlayer!]!["accessLevel"]!;
                string officerStatus = (string)officers![currentPlayer!]!["status"]!;
                string officerArea = GetOfficerArea(offierAccessLevel, formDetails);

                var row = new Dictionary<string, object>
                {
                    ["sno"] = sno++,
                    ["referenceNumber"] = details.ReferenceNumber ?? ""
                };

                // Add location fields based on access level
                if (accessLevel == "State")
                {
                    row["divisionName"] = details.DivisionName ?? "N/A";
                    row["districtName"] = details.DistrictName ?? "N/A";
                }
                else if (accessLevel == "Division")
                {
                    row["districtName"] = details.DistrictName ?? "N/A";
                    row["tehsilName"] = details.TehsilName ?? "N/A";
                }
                else if (accessLevel == "District")
                {
                    row["tehsilName"] = details.TehsilName ?? "N/A";
                }

                // Add the rest of the fields
                row["applicantName"] = applicantName;
                row["serviceName"] = serviceName;
                row["currentlyWith"] = officerStatus == "returntoedit" ? "Citizen" : $"{officerDesignation} ({officerArea})";
                row["status"] = status;
                row["submissionDate"] = submissionDate!;

                // Add Sanction Date only if column is shown
                if (showSanctionDateColumn)
                {
                    string sanctionDate = "-";

                    if (status == "Sanctioned" && !string.IsNullOrEmpty(details.WorkFlow))
                    {
                        try
                        {
                            var workflow = JsonConvert.DeserializeObject<JArray>(details.WorkFlow);
                            var sanctionedStep = workflow?
                                .FirstOrDefault(w => w["status"]?.ToString() == "sanctioned");

                            if (sanctionedStep?["completedAt"] != null)
                            {
                                sanctionDate = sanctionedStep["completedAt"]!.ToString();
                            }
                        }
                        catch
                        {
                            sanctionDate = "-";
                        }
                    }

                    row["sanctionDate"] = sanctionDate;
                }

                data.Add(row);
            }

            // === Return Clean JSON ===
            return Json(new
            {
                data,
                columns,
                totalRecords
            });
        }


        [HttpGet]
        public async Task<IActionResult> GetApplicationHistory(string ApplicationId, int page = 0, int size = 10)
        {
            if (string.IsNullOrEmpty(ApplicationId))
            {
                return BadRequest("ApplicationId is required.");
            }

            var application = await dbcontext.CitizenApplications
                .FirstOrDefaultAsync(ca => ca.ReferenceNumber == ApplicationId);

            if (application == null)
            {
                return NotFound("Application not found.");
            }

            var players = JsonConvert.DeserializeObject<JArray>(application.WorkFlow!);
            int currentPlayerIndex = (int)application.CurrentPlayer!;
            var currentPlayer = players!.FirstOrDefault(o => (int)o["playerId"]! == currentPlayerIndex);

            var history = await dbcontext.ActionHistory
                .Where(ah => ah.ReferenceNumber == ApplicationId && !ah.ActionTaken.Contains("Withheld"))
                .OrderBy(ah => ah.ActionTakenDate)
                .ToListAsync();

            var formDetails = JsonConvert.DeserializeObject<dynamic>(application.FormDetails!);

            var columns = new List<dynamic>
    {
        new { header = "S.No", accessorKey = "sno" },
        new { header = "Action Taker", accessorKey = "actionTaker" },
        new { header = "Action Taken", accessorKey = "actionTaken" },
        new { header = "Remarks", accessorKey = "remarks" },
        new { header = "Action Taken On", accessorKey = "actionTakenOn" },
    };

            var data = new List<dynamic>();
            int index = 1;

            foreach (var item in history)
            {
                string officerArea = GetOfficerAreaForHistory(item.LocationLevel!, item.LocationValue.ToString()!);
                data.Add(new
                {
                    sno = index++,
                    actionTaker = item.ActionTaker != "Citizen" ? item.ActionTaker + " " + officerArea : item.ActionTaker,
                    actionTaken = item.ActionTaken == "ReturnToCitizen" ? "Returned to citizen for correction" : item.ActionTaken,
                    remarks = item.Remarks ?? "",
                    actionTakenOn = item.ActionTakenDate?.ToString() ?? "",
                });
            }

            // Add current pending status if applicable
            if (currentPlayer != null && (string)currentPlayer["status"]! == "pending")
            {
                string designation = (string)currentPlayer["designation"]!;
                string accessLevel = (string)currentPlayer["accessLevel"]!;
                string officerArea = GetOfficerArea(accessLevel, formDetails);

                data.Add(new
                {
                    sno = index++,
                    actionTaker = designation + " " + officerArea,
                    actionTaken = "Pending",
                    remarks = "",
                    actionTakenOn = "",
                });
            }

            int totalRecords = data.Count;

            return Json(new { data, columns, totalRecords });
        }

        private string GetOfficerAreaForHistory(string locationLevel, string locationValue)
        {
            if (string.IsNullOrEmpty(locationValue)) return "";

            int locId = int.Parse(locationValue);

            return locationLevel switch
            {
                "Tehsil" => dbcontext.Tswotehsil.FirstOrDefault(t => t.TehsilId == locId)?.TehsilName ?? "",
                "District" => dbcontext.District.FirstOrDefault(d => d.DistrictId == locId)?.DistrictName ?? "",
                "Division" => locId == 1 ? "Jammu" : "Kashmir",
                _ => ""
            };
        }


    }
}