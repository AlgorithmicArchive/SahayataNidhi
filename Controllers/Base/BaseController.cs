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
using Wangkanai.Detection.Services;

namespace SahayataNidhi.Controllers
{
    public partial class BaseController(SwdjkContext dbcontext, ILogger<BaseController> logger, IDetectionService detection, IWebHostEnvironment webHostEnvironment) : Controller
    {
        protected readonly SwdjkContext dbcontext = dbcontext;
        protected readonly ILogger<BaseController> _logger = logger;
        private readonly IDetectionService _detection = detection;
        private readonly IWebHostEnvironment _webHostEnvironment = webHostEnvironment;


        private const long MinImageFile = 20 * 1024;  // 20KB
        private const long MaxImageFile = 50 * 1024;  // 50KB
        private const long MinPdfFile = 100 * 1024; // 100KB
        private const long MaxPdfFile = 200 * 1024; // 200KB





        [HttpPost]
        public IActionResult SaveTableSettings([FromForm] IFormCollection form)
        {
            string storageKey = form["storageKey"].ToString(); // ✅ fixed typo
            string storageValue = form["storageValue"].ToString();

            var userId = Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var userDetails = dbcontext.Users.FirstOrDefault(u => u.UserId == userId);

            if (userDetails == null || string.IsNullOrWhiteSpace(userDetails.AdditionalDetails))
            {
                return BadRequest("User not found or AdditionalDetails is empty.");
            }

            // Parse AdditionalDetails as JSON
            var additionalDetails = JObject.Parse(userDetails.AdditionalDetails);

            if (additionalDetails.TryGetValue("TableSettings", out JToken? tableSettingsToken) &&
                tableSettingsToken is JObject tableSettings)
            {
                // Update or add the key
                tableSettings[storageKey] = JsonConvert.DeserializeObject<dynamic>(storageValue);
            }
            else
            {
                // Create new TableSettings section
                additionalDetails["TableSettings"] = new JObject
                {
                    [storageKey] = storageValue
                };
            }

            // ✅ Important: Save updated JSON back to user object
            userDetails.AdditionalDetails = additionalDetails.ToString();

            // Persist changes
            dbcontext.SaveChanges();

            return Json(new { status = true });
        }



    }
}