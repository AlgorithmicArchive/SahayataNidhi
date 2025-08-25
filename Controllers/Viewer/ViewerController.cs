using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers.Officer
{
    [Authorize(Roles = "Viewer")]
    public partial class ViewerController(SocialWelfareDepartmentContext dbcontext, ILogger<ViewerController> logger,
        UserHelperFunctions helper) : Controller
    {
        protected readonly SocialWelfareDepartmentContext dbcontext = dbcontext;
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
                    bgColor = "#f8faff",
                    gradientStart = "#4f46e5",
                    gradientEnd = "#3b82f6",
                },
                new
                {
                    title = "Sanctioned",
                    value = counts.SanctionedCount.ToString("N0"),
                    category = "application",
                    color = "success",
                    bgColor = "#f0fdf4",
                    gradientStart = "#059669",
                    gradientEnd = "#10b981",
                },
                new
                {
                    title = "Under Process",
                    value = counts.PendingCount.ToString("N0"),
                    category = "application",
                    color = "warning",
                    bgColor = "#fffbeb",
                    gradientStart = "#f59e0b",
                    gradientEnd = "#fbbf24",
                },
                new
                {
                    title = "Pending with Citizen",
                    value = counts.ReturnToEditCount.ToString("N0"),
                    category = "application",
                    color = "info",
                    bgColor = "#f0f9ff",
                    gradientStart = "#0ea5e9",
                    gradientEnd = "#38bdf8",
                },
                new
                {
                    title = "Rejected",
                    value = counts.RejectCount.ToString("N0"),
                    category = "application",
                    color = "error",
                    bgColor = "#fef2f2",
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
    }
}