using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers
{
    public partial class DesignerController
    {
        [HttpPost]
        public IActionResult ToggleServiceActive([FromForm] IFormCollection form)
        {
            int serviceId = Convert.ToInt32(form["serviceId"].ToString());
            bool active = Convert.ToBoolean(form["active"]);

            var svc = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
            if (svc == null)
                return Json(new { status = false, message = "Not found" });

            svc.Active = active;
            dbcontext.SaveChanges();
            return Json(new { status = true, active = svc.Active });
        }
        [HttpPost]
        public IActionResult ToggleWebServiceActive([FromForm] IFormCollection form)
        {
            try
            {
                int webserviceId = Convert.ToInt32(form["webserviceId"].ToString());
                bool active = Convert.ToBoolean(form["active"]);

                var svc = dbcontext.WebService.FirstOrDefault(s => s.Id == webserviceId);
                if (svc == null)
                {
                    return Json(new { status = false, message = "Web service not found" });
                }

                if (active)
                {
                    // Check for other active web services for the same ServiceId
                    var otherActiveWebService = dbcontext.WebService
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
                return Json(new { status = false, message = $"Error toggling web service: {ex.Message}" });
            }
        }

        [HttpPost]
        public IActionResult SaveWebService([FromForm] IFormCollection form)
        {
            try
            {
                var webServiceId = form["webServiceId"].ToString();
                var serviceId = form["serviceId"].ToString();
                var webServiceName = form["webServiceName"].ToString();
                var apiEndPoint = form["apiEndPoint"].ToString();
                var onAction = form["onAction"].ToString(); // JSON string
                var fieldMappings = form["fieldMappings"].ToString(); // JSON string
                var createdAt = form["createdAt"].ToString();
                var updatedAt = form["updatedAt"].ToString();

                WebService webService;

                // Try parse webServiceId
                if (int.TryParse(webServiceId, out int parsedWebServiceId))
                {
                    // Update existing web service
                    webService = dbcontext.WebService
                        .FirstOrDefault(ws => ws.Id == parsedWebServiceId)!;

                    if (webService != null)
                    {
                        webService.ServiceId = Convert.ToInt32(serviceId); // ✅ ensure FK is set
                        webService.WebServiceName = webServiceName;
                        webService.ApiEndPoint = apiEndPoint;
                        webService.OnAction = onAction;
                        webService.FieldMappings = fieldMappings;
                        webService.UpdatedAt = updatedAt;
                    }
                    else
                    {
                        return Json(new
                        {
                            status = false,
                            message = "Web service not found for the provided WebServiceId"
                        });
                    }
                }
                else
                {
                    // Create new web service
                    webService = new WebService
                    {
                        ServiceId = Convert.ToInt32(serviceId), // ✅ set FK
                        WebServiceName = webServiceName,
                        ApiEndPoint = apiEndPoint,
                        OnAction = onAction,
                        FieldMappings = fieldMappings,
                        CreatedAt = createdAt,
                        UpdatedAt = updatedAt,
                        IsActive = true
                    };

                    dbcontext.WebService.Add(webService);
                }

                dbcontext.SaveChanges();

                return Json(new
                {
                    status = true,
                    message = string.IsNullOrEmpty(webServiceId)
                        ? "Web service configuration saved successfully"
                        : "Web service configuration updated successfully",
                    webServiceId = webService.Id
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = false,
                    message = "Failed to save configuration",
                    error = ex.Message
                });
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
        [HttpPost]
        public IActionResult FormElement([FromForm] IFormCollection form)
        {
            string serviceIdString = form["serviceId"].ToString();
            string serviceName = form["serviceName"].ToString();
            string serviceNameShort = form["serviceNameShort"].ToString();
            string departmentIdString = form["departmentId"].ToString();

            // Validate departmentId
            if (string.IsNullOrEmpty(departmentIdString) || !int.TryParse(departmentIdString, out int departmentId))
            {
                return Json(new { status = false, response = "Invalid or missing Department ID." });
            }

            var formElement = form["formElement"].ToString();

            if (!string.IsNullOrEmpty(serviceIdString))
            {
                if (!int.TryParse(serviceIdString, out int serviceId))
                {
                    return Json(new { status = false, response = "Invalid Service ID." });
                }

                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);

                if (service != null)
                {
                    if (service.FormElement != formElement)
                        service.FormElement = formElement;

                    if (service.ServiceName != serviceName)
                        service.ServiceName = serviceName;

                    if (service.NameShort != serviceNameShort)
                        service.NameShort = serviceNameShort;

                    if (service.DepartmentId != departmentId)
                        service.DepartmentId = departmentId;
                }
            }
            else
            {
                var newService = new Services
                {
                    FormElement = formElement,
                    ServiceName = serviceName,
                    NameShort = serviceNameShort,
                    DepartmentId = departmentId
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
                    service.OfficerEditableField = workFlowPlayers;
                    dbcontext.Services.Update(service);
                }
            }
            else
            {
                var newService = new Services
                {
                    OfficerEditableField = workFlowPlayers
                };
                dbcontext.Services.Add(newService);
            }

            dbcontext.SaveChanges();

            dbcontext.Database.ExecuteSqlRaw("EXEC UpdateWorkflowForService @ServiceId", new SqlParameter("@ServiceId", Convert.ToInt32(serviceIdString)));

            return Json(new { status = true });
        }

        [HttpPost]
        public IActionResult SetEmailSettings([FromForm] IFormCollection form)
        {
            try
            {
                string senderName = form["SenderName"].ToString();
                string senderEmail = form["SenderEmail"].ToString();
                string smtpServer = form["SmtpServer"].ToString();
                int smtpPort = Convert.ToInt32(form["SmtpPort"].ToString());
                string password = form["Password"].ToString();

                string? key = _configuration["Encryption:Key"];
                if (string.IsNullOrEmpty(key))
                {
                    return Json(new { success = false, message = "Encryption key not found in configuration." });
                }

                string encryptedPassword = _encryptionService.Encrypt(password, key);

                var emailSetting = new Models.Entities.EmailSettings
                {
                    SenderName = senderName,
                    SenderEmail = senderEmail,
                    SmtpServer = smtpServer,
                    SmtpPort = smtpPort,
                    Password = encryptedPassword,
                };

                dbcontext.EmailSettings.Add(emailSetting);
                dbcontext.SaveChanges();

                return Json(new { success = true, message = "Email settings saved successfully." });
            }
            catch (Exception ex)
            {
                // Log the exception (optional)
                return Json(new { success = false, message = "An error occurred.", error = ex.Message });
            }

        }

        [HttpPost]
        public IActionResult SaveEmailTemplate([FromForm] IFormCollection form)
        {
            var emailSettings = dbcontext.EmailSettings.FirstOrDefault();
            if (emailSettings == null)
                return BadRequest("Email settings not found.");

            // Deserialize the template JSON into a JObject
            JObject templates = JObject.Parse(emailSettings.Templates ?? "{}");

            // Get key and new value from form
            string key = form["type"].ToString();           // e.g., "Submission"
            string newValue = form["template"].ToString();  // e.g., "Updated submission text"

            // Set or update the value
            templates[key] = newValue;

            // Save the updated object back to the database
            emailSettings.Templates = JsonConvert.SerializeObject(templates);
            dbcontext.SaveChanges();

            return Json(new { success = true, updated = true, key, value = newValue });
        }

        [HttpPost]
        public IActionResult SaveDocumentFields([FromForm] IFormCollection form)
        {
            int serviceId = Convert.ToInt32(form["serviceId"].ToString());
            string documentType = form["documentType"].ToString();
            string fields = form["fields"].ToString();

            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
            if (service == null)
            {
                return Json(new { status = false, message = "Service not found." });
            }

            // Deserialize the fields input
            List<object> fieldsList;
            try
            {
                fieldsList = JsonConvert.DeserializeObject<List<object>>(fields)!;
                if (fieldsList == null)
                {
                    return Json(new { status = false, message = "Invalid fields data." });
                }

                // Validate fieldsList
                foreach (var field in fieldsList)
                {
                    if (field is string)
                    {
                        // Single field, no additional validation needed
                    }
                    else if (field is Newtonsoft.Json.Linq.JObject jObject)
                    {
                        // Group field
                        if (!jObject.ContainsKey("label") || !jObject.ContainsKey("fields"))
                        {
                            return Json(new { status = false, message = "Invalid group format: missing label or fields." });
                        }
                        if (string.IsNullOrEmpty(jObject["label"]?.ToString()))
                        {
                            return Json(new { status = false, message = "Group label cannot be empty." });
                        }
                        var groupFields = jObject["fields"]?.ToObject<List<string>>();
                        if (groupFields == null || groupFields.Count == 0)
                        {
                            return Json(new { status = false, message = "Group fields cannot be empty." });
                        }
                    }
                    else
                    {
                        return Json(new { status = false, message = "Invalid field format." });
                    }
                }
            }
            catch (JsonException)
            {
                return Json(new { status = false, message = "Failed to parse fields data." });
            }

            // Initialize or deserialize existing DocumentFields
            Dictionary<string, List<object>> documentFields;
            if (string.IsNullOrEmpty(service.DocumentFields))
            {
                documentFields = new Dictionary<string, List<object>>();
            }
            else
            {
                try
                {
                    documentFields = JsonConvert.DeserializeObject<Dictionary<string, List<object>>>(service.DocumentFields)!;
                    if (documentFields == null)
                    {
                        documentFields = new Dictionary<string, List<object>>();
                    }
                }
                catch (JsonException)
                {
                    return Json(new { status = false, message = "Failed to parse existing document fields." });
                }
            }

            // Update or create the documentType entry
            documentFields[documentType] = fieldsList;

            // Serialize and save back to the database
            try
            {
                service.DocumentFields = JsonConvert.SerializeObject(documentFields);
                dbcontext.SaveChanges();
                return Json(new { status = true, message = "Document fields saved successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = $"Error saving document fields: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SaveServiceConfig([FromForm] int serviceId, [FromForm] string submissionLimitConfig)
        {
            try
            {
                if (serviceId <= 0)
                {
                    return BadRequest(new { status = false, message = "Invalid service ID." });
                }

                if (string.IsNullOrWhiteSpace(submissionLimitConfig))
                {
                    return BadRequest(new { status = false, message = "SubmissionLimitConfig is required." });
                }

                // Validate JSON
                try
                {
                    var config = JsonConvert.DeserializeObject<dynamic>(submissionLimitConfig);
                    if (config!.isLimited == true)
                    {
                        string limitType = config.limitType?.ToString()!;
                        int limitCount = config.limitCount != null ? (int)config.limitCount : 0;

                        if (string.IsNullOrEmpty(limitType) || !new[] { "All Time", "Yearly", "Monthly", "Weekly", "Daily" }.Contains(limitType))
                        {
                            return BadRequest(new { status = false, message = "Invalid limit type. Must be 'All Time', 'Yearly', 'Monthly', 'Weekly', or 'Daily'." });
                        }
                        if (limitCount <= 0)
                        {
                            return BadRequest(new { status = false, message = "Limit count must be greater than zero when limits are enabled." });
                        }
                    }
                }
                catch (JsonException)
                {
                    return BadRequest(new { status = false, message = "Invalid SubmissionLimitConfig JSON format." });
                }

                var service = await dbcontext.Services
                    .Where(s => s.ServiceId == serviceId)
                    .FirstOrDefaultAsync();

                if (service == null)
                {
                    return NotFound(new { status = false, message = "Service not found." });
                }

                service.SubmissionLimitConfig = submissionLimitConfig;
                await dbcontext.SaveChangesAsync();

                return Ok(new { status = true, message = "Configuration saved successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error saving configuration: {ex.Message}" });
            }
        }
    }
}
