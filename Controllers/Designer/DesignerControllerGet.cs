using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;
using JsonException = Newtonsoft.Json.JsonException;

namespace SahayataNidhi.Controllers
{
    public partial class DesignerController
    {
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
                var department = dbcontext.Departments.FirstOrDefault(d => d.DepartmentId == item.DepartmentId)?.DepartmentName ?? "N/A";
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
                    department = department,
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

        [HttpGet]
        public IActionResult GetWebService(int serviceId)
        {
            try
            {
                var webService = dbcontext.WebServices
                    .FirstOrDefault(ws => ws.ServiceId == serviceId);

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
            catch (Newtonsoft.Json.JsonException ex)
            {
                return BadRequest($"Invalid JSON format: {ex.Message}");
            }
        }

        [HttpGet]
        public IActionResult GetFormElements([FromQuery] string serviceId)
        {
            // Validate serviceId
            if (string.IsNullOrWhiteSpace(serviceId) || !int.TryParse(serviceId, out int parsedServiceId))
            {
                return BadRequest(new { status = false, message = "Invalid service ID." });
            }

            // Fetch the service
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == parsedServiceId);
            if (service == null || string.IsNullOrWhiteSpace(service.FormElement))
            {
                return BadRequest(new { status = false, message = "Service not found or no form elements found." });
            }

            // Parse the JSON into a JToken
            JToken root = JToken.Parse(service.FormElement);

            // Extract sections and fields
            var sections = new List<object>();
            foreach (var sectionToken in root)
            {
                var sectionName = (string)sectionToken["section"]!;
                var sectionFields = new List<object>();

                // Add top-level fields
                var fields = sectionToken["fields"];
                if (fields != null)
                {
                    foreach (var field in fields)
                    {
                        var fieldName = (string)field["name"]!;
                        var fieldLabel = (string)field["label"]!;
                        if (!string.IsNullOrWhiteSpace(fieldName) && !string.IsNullOrWhiteSpace(fieldLabel))
                        {
                            sectionFields.Add(new { name = fieldName, label = fieldLabel });
                        }

                        // Handle nested additionalFields recursively
                        var additionalFields = field["additionalFields"];
                        if (additionalFields != null && additionalFields.HasValues)
                        {
                            foreach (var additionalFieldGroup in additionalFields)
                            {
                                foreach (var additionalFieldArray in additionalFieldGroup)
                                {
                                    foreach (var additionalField in additionalFieldArray)
                                    {
                                        var nestedName = (string)additionalField["name"]!;
                                        var nestedLabel = (string)additionalField["label"]!;
                                        if (!string.IsNullOrWhiteSpace(nestedName) && !string.IsNullOrWhiteSpace(nestedLabel))
                                        {
                                            sectionFields.Add(new { name = nestedName, label = nestedLabel });
                                        }

                                        // Handle further nested additionalFields
                                        var nestedAdditionalFields = additionalField["additionalFields"];
                                        if (nestedAdditionalFields != null && nestedAdditionalFields.HasValues)
                                        {
                                            foreach (var nestedGroup in nestedAdditionalFields)
                                            {
                                                foreach (var nestedArray in nestedGroup)
                                                {
                                                    foreach (var nestedField in nestedArray)
                                                    {
                                                        var deepNestedName = (string)nestedField["name"]!;
                                                        var deepNestedLabel = (string)nestedField["label"]!;
                                                        if (!string.IsNullOrWhiteSpace(deepNestedName) && !string.IsNullOrWhiteSpace(deepNestedLabel))
                                                        {
                                                            sectionFields.Add(new { name = deepNestedName, label = deepNestedLabel });
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                sections.Add(new
                {
                    sectionName,
                    fields = sectionFields
                });
            }

            // Get column names from DbContext
            var entityType = dbcontext.Model.FindEntityType(typeof(CitizenApplication));
            if (entityType == null)
            {
                return BadRequest(new { status = false, message = "Entity not found in DbContext." });
            }

            var columnNames = entityType.GetProperties()
                .Select(p => p.GetColumnName())
                .ToList();

            return Json(new
            {
                status = true,
                sections,
                columnNames
            });
        }
        [HttpGet]
        public IActionResult GetFormElementsForEmail(string serviceId)
        {
            if (!int.TryParse(serviceId, out int serviceIdInt))
            {
                return BadRequest(new { error = "Invalid serviceId." });
            }

            var service = dbcontext.Services
                .FirstOrDefault(s => s.ServiceId == serviceIdInt);

            if (service == null || string.IsNullOrWhiteSpace(service.FormElement))
            {
                return BadRequest(new { error = "No form elements found for the given serviceId." });
            }

            try
            {
                var allNames = new List<string>
                {
                    "ApplicantName",
                    "ActionTaken",
                    "OfficerRole",
                    "OfficerArea",
                    "ReferenceNumber",
                    "ServiceName",
                    "CreatedAt"
                };


                // Parse the JSON string
                // JToken root = JToken.Parse(service.FormElement);

                // // Extract form names from JSON with validation
                // var formNames = root
                //     .SelectTokens("$..name")
                //     .Where(t => t != null && t.Type == JTokenType.String) // Ensure valid strings
                //     .Select(t => t.ToString().Trim())
                //     .Where(name => !string.IsNullOrWhiteSpace(name))
                //     .Distinct()
                //     .ToList();

                // formNames.Add("ReferenceNumber");

                // // Reflect properties from the Service class (model)
                // var serviceProperties = typeof(Models.Entities.Service)
                //     .GetProperties()
                //     .Where(p => p.CanRead) // Ensure readable properties
                //     .Select(p => p.Name)
                //     .Where(name => !string.IsNullOrWhiteSpace(name)) // Filter out empty names
                //     .ToList();

                // _logger.LogInformation($"----- Service Properties: {serviceProperties} ----------------------------------");

                // // Combine, deduplicate, and sort alphabetically
                // var allNames = formNames
                //     .Concat(serviceProperties)
                //     .Distinct(StringComparer.OrdinalIgnoreCase)
                //     .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
                //     .ToList();

                // Debug log to verify data
                if (!allNames.Any())
                {
                    return BadRequest(new { error = "No valid form elements or service properties found." });
                }

                return Ok(new { names = allNames });
            }
            catch (Newtonsoft.Json.JsonException ex)
            {
                return BadRequest(new { error = "Failed to parse JSON.", details = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetDocumentFields([FromQuery] int serviceId)
        {
            // Validate serviceId
            if (serviceId <= 0)
            {
                return Json(new { status = false, message = "Invalid service ID." });
            }

            // Fetch the service from the database
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
            if (service == null)
            {
                return Json(new { status = false, message = "Service not found." });
            }

            // Check if DocumentFields exist
            if (string.IsNullOrEmpty(service.DocumentFields))
            {
                return Json(new
                {
                    status = true,
                    documentFields = new
                    {
                        Correction = new List<object>(),
                        Corrigendum = new List<object>(),
                        Amendment = new List<object>()
                    }
                });
            }

            // Deserialize DocumentFields
            try
            {
                var documentFields = JsonConvert.DeserializeObject<Dictionary<string, List<object>>>(service.DocumentFields);
                if (documentFields == null)
                {
                    return Json(new
                    {
                        status = true,
                        documentFields = new
                        {
                            Correction = new List<object>(),
                            Corrigendum = new List<object>(),
                            Amendment = new List<object>()
                        }
                    });
                }

                // Ensure Correction, Corrigendum, and Amendment keys exist
                var responseFields = new
                {
                    Correction = documentFields.ContainsKey("Correction") ? documentFields["Correction"] : new List<object>(),
                    Corrigendum = documentFields.ContainsKey("Corrigendum") ? documentFields["Corrigendum"] : new List<object>(),
                    Amendment = documentFields.ContainsKey("Amendment") ? documentFields["Amendment"] : new List<object>()
                };

                return Json(new { status = true, documentFields = responseFields });
            }
            catch (Newtonsoft.Json.JsonException)
            {
                return Json(new { status = false, message = "Failed to parse document fields." });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = $"Error retrieving document fields: {ex.Message}" });
            }
        }


        [HttpGet]
        public IActionResult GetEmailTemplate([FromQuery] int serviceId, [FromQuery] string type)
        {
            if (serviceId <= 0 || string.IsNullOrEmpty(type))
            {
                return Json(new { status = false, message = "Invalid service ID or email type." });
            }

            var service = dbcontext.EmailSettings.FirstOrDefault(s => s.Id == serviceId);
            if (service == null)
            {
                return Json(new { status = false, message = "Service not found." });
            }

            // Assuming email templates are stored in a column named EmailTemplates as JSON
            if (string.IsNullOrEmpty(service.Templates))
            {
                return Json(new { status = true, template = "" });
            }

            try
            {
                var emailTemplates = JsonConvert.DeserializeObject<Dictionary<string, string>>(service.Templates);
                var template = emailTemplates?.ContainsKey(type) == true ? emailTemplates[type] : "";
                return Json(new { status = true, template });
            }
            catch (Newtonsoft.Json.JsonException)
            {
                return Json(new { status = false, message = "Failed to parse email templates." });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = $"Error retrieving email template: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetServiceConfig([FromQuery] int serviceId)
        {
            try
            {
                if (serviceId <= 0)
                {
                    return BadRequest(new { status = false, message = "Invalid service ID." });
                }

                var service = await dbcontext.Services
                    .AsNoTracking()
                    .Where(s => s.ServiceId == serviceId)
                    .Select(s => new { s.SubmissionLimitConfig })
                    .FirstOrDefaultAsync();

                if (service == null)
                {
                    return NotFound(new { status = false, message = "Service not found." });
                }

                try
                {
                    var config = JsonConvert.DeserializeObject<dynamic>(service.SubmissionLimitConfig!);
                    return Ok(new { status = true, config });
                }
                catch (JsonException)
                {
                    // Return default config if JSON is invalid
                    return Ok(new
                    {
                        status = true,
                        config = new
                        {
                            isLimited = false,
                            limitType = "",
                            limitCount = 0
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error fetching configuration: {ex.Message}" });
            }
        }
    }
}