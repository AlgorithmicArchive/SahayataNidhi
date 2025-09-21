using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers.Admin
{
    [Authorize(Roles = "Admin")]
    public partial class AdminController(SocialWelfareDepartmentContext dbcontext, ILogger<AdminController> logger, UserHelperFunctions helper) : Controller
    {
        protected readonly SocialWelfareDepartmentContext dbcontext = dbcontext;
        protected readonly ILogger<AdminController> _logger = logger;
        protected readonly UserHelperFunctions helper = helper;


        public override void OnActionExecuted(ActionExecutedContext context)
        {
            base.OnActionExecuted(context);
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var Admin = dbcontext.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
            var additionalDetails = JsonConvert.DeserializeObject<Dictionary<string, object>>(Admin?.AdditionalDetails ?? "{}");
            string AdminDesignation = additionalDetails!.TryGetValue("Role", out var roleObj) ? roleObj?.ToString() ?? "Unknown" : "Unknown";
            int departmentId = Convert.ToInt32(additionalDetails["Department"]);
            var department = dbcontext.Departments.FirstOrDefault(d => d.DepartmentId == departmentId);
            string Profile = Admin!.Profile!;
            ViewData["AdminType"] = AdminDesignation;
            ViewData["UserName"] = Admin!.Username;
            ViewData["Profile"] = Profile == "" ? "/assets/dummyDocs/formImage.jpg" : Profile;
            ViewData["Department"] = department?.DepartmentName ?? "Unknown";
        }

        public OfficerDetailsModal? GetOfficerDetails()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                // Log the issue for debugging
                _logger.LogWarning("GetOfficerDetails: UserId is null. User is not authenticated or NameIdentifier claim is missing.");
                return null;
            }


            var parameter = new SqlParameter("@UserId", userId);
            var officer = dbcontext.Database
                .SqlQuery<OfficerDetailsModal>($"EXEC GetOfficerDetails @UserId = {parameter}")
                .AsEnumerable()
                .FirstOrDefault();

            return officer;
        }

        [HttpGet]
        public IActionResult GetServiceList()
        {
            var officer = GetOfficerDetails();

            // Fetch the service list for the given role
            var roleParameter = new SqlParameter("@Role", officer!.Role);
            var serviceList = dbcontext.Database
                                       .SqlQuery<OfficerServiceListModal>($"EXEC GetServicesByRole @Role = {roleParameter}")
                                       .AsEnumerable() // To avoid composability errors
                                       .ToList();

            return Json(new { serviceList });
        }

    }
}