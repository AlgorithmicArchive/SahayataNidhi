using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using SahayataNidhi.Models.Entities;
using System.Security.Claims;
using Newtonsoft.Json.Linq;

namespace SahayataNidhi.Controllers.User
{
    public partial class UserController
    {
        [HttpPost]
        public async Task<IActionResult> InsertFormDetails([FromForm] IFormCollection form)
        {
            // Retrieve userId from JWT token
            int userId = Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            int serviceId = Convert.ToInt32(form["serviceId"].ToString());
            string formDetailsJson = form["formDetails"].ToString();
            string status = form["status"].ToString();
            string ReferenceNumber = form["referenceNumber"].ToString();
            string OfficerRole = "";
            string OfficerArea = "";

            _logger.LogInformation($"------------------Reference Number: {ReferenceNumber}------------------");

            var formDetailsObj = JObject.Parse(formDetailsJson);

            // Flatten all sections into a single collection of fields.
            var allFields = formDetailsObj.Properties()
                .Where(prop => prop.Value is JArray)
                .SelectMany(prop => (JArray)prop.Value)
                .OfType<JObject>();

            // Process each file.
            foreach (var file in form.Files)
            {
                _logger.LogInformation($"--------- Filename: {file.FileName} ------------------");
                string filePath = await helper.GetFilePath(file)!;
                foreach (var field in allFields.Where(f => f["name"]?.ToString() == file.Name))
                {
                    field["File"] = filePath;
                }
            }

            // Here we look for any key that contains "District" (case-insensitive) and try to parse its value as an integer.
            int districtId = 0;
            districtId = formDetailsObj.Properties()
                .SelectMany(section => section.Value is JArray fields
                    ? fields.OfType<JObject>()
                    : [])
                .Where(field => field["name"]?.ToString() == "District")
                .Select(field => Convert.ToInt32(field["value"]))
                .FirstOrDefault();

            if (string.IsNullOrEmpty(ReferenceNumber))
            {
                int count = GetCountPerDistrict(districtId, serviceId);
                string bankUid = count.ToString("D6");
                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
                var districtDetails = dbcontext.Districts.FirstOrDefault(s => s.DistrictId == districtId);
                string districtShort = districtDetails!.DistrictShort!;
                OfficerArea = districtDetails.DistrictName!;
                var officerEditableField = service!.OfficerEditableField;

                if (string.IsNullOrEmpty(officerEditableField))
                {
                    return Json(new { status = false });
                }

                // Parse the OfficerEditableField JSON
                var players = JArray.Parse(officerEditableField);
                if (players.Count == 0)
                {
                    return Json(new { status = false });
                }

                // Create a new JArray to store filtered workflow
                var filteredWorkflow = new JArray();

                foreach (var player in players)
                {
                    // Create a new JObject with only the required fields
                    var filteredPlayer = new JObject
                    {
                        ["designation"] = player["designation"],
                        ["status"] = player["status"],
                        ["completedAt"] = player["completedAt"],
                        ["remarks"] = player["remarks"],
                        ["playerId"] = player["playerId"],
                        ["prevPlayerId"] = player["prevPlayerId"],
                        ["nextPlayerId"] = player["nextPlayerId"],
                        ["canPull"] = player["canPull"]
                    };

                    filteredWorkflow.Add(filteredPlayer);
                }

                // Set the status of the first player to "pending"
                if (filteredWorkflow.Count > 0)
                {
                    filteredWorkflow[0]["status"] = "pending";
                    OfficerRole = filteredWorkflow[0]["designation"]?.ToString() ?? string.Empty;
                }

                var workFlow = filteredWorkflow.ToString(Formatting.None);
                var finYear = helper.GetCurrentFinancialYear();
                ReferenceNumber = "JK-" + service.NameShort + "-" + districtShort + "/" + finYear + "/" + count;
                var createdAt = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");

                // Store the updated JSON (with file paths) in the database.
                var newFormDetails = new CitizenApplication
                {
                    ReferenceNumber = ReferenceNumber,
                    CitizenId = userId,
                    ServiceId = serviceId,
                    DistrictUidForBank = bankUid,
                    FormDetails = formDetailsObj.ToString(),
                    WorkFlow = workFlow!,
                    Status = status,
                    CreatedAt = createdAt
                };

                dbcontext.CitizenApplications.Add(newFormDetails);
            }
            else
            {
                var application = dbcontext.CitizenApplications.FirstOrDefault(a => a.ReferenceNumber == ReferenceNumber);
                application!.FormDetails = formDetailsObj.ToString();

                if (application.Status != status)
                {
                    application.Status = status;
                }
                application.CreatedAt = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");
            }

            dbcontext.SaveChanges();

            if (status == "Initiated")
            {
                var getServices = dbcontext.WebServices.FirstOrDefault(ws => ws.ServiceId == serviceId && ws.IsActive);
                if (getServices != null)
                {
                    var onAction = JsonConvert.DeserializeObject<List<string>>(getServices.OnAction);
                    if (onAction != null && onAction.Contains("Submission"))
                    {
                        try
                        {
                            var fieldMapObj = JObject.Parse(getServices.FieldMappings);
                            var fieldMap = MapServiceFieldsFromForm(formDetailsObj, fieldMapObj);
                            await SendApiRequestAsync(getServices.ApiEndPoint, fieldMap);
                        }
                        catch (Exception ex)
                        {
                            // Log the error but continue execution
                            _logger.LogError(ex, $"Failed to send API request to {getServices.ApiEndPoint} for Reference: {ReferenceNumber}");
                        }
                    }
                }

                string fullPath = await FetchAcknowledgementDetails(ReferenceNumber);
                string? fullName = GetFormFieldValue(formDetailsObj, "ApplicantName");
                string? ServiceName = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId)!.ServiceName;
                string? email = GetFormFieldValue(formDetailsObj, "Email");

                var emailtemplate = JObject.Parse(dbcontext.EmailSettings.FirstOrDefault()!.Templates!);
                string template = emailtemplate["Submission"]!.ToString();

                var placeholders = new Dictionary<string, string>
                {
                    { "ApplicantName", GetFormFieldValue(formDetailsObj, "ApplicantName") ?? "" },
                    { "ServiceName", ServiceName!},
                    { "ReferenceNumber", ReferenceNumber },
                    { "OfficerRole", OfficerRole },
                    { "OfficerArea", OfficerArea }
                };

                foreach (var pair in placeholders)
                {
                    template = template.Replace($"{{{pair.Key}}}", pair.Value);
                }

                string htmlMessage = template;


                _logger.LogInformation($"------ HTML MESSAGE: {htmlMessage} --------------");

                var attachments = new List<string> { fullPath };

                try
                {
                    await emailSender.SendEmailWithAttachments(email!, "Form Submission", htmlMessage, attachments);
                }
                catch (Exception ex)
                {
                    // Log the email sending error but continue execution
                    _logger.LogError(ex, $"Failed to send email for Reference: {ReferenceNumber}, Email: {email}");
                }

                string field = GetFormFieldValue(formDetailsObj, "Tehsil") != null ? "Tehsil" : "District";
                string? value = GetFormFieldValue(formDetailsObj, field);

                string? locationLevel = field;
                int locationValue = Convert.ToInt32(value);

                helper.InsertHistory(ReferenceNumber, "Application Submission", "Citizen", "Submitted", locationLevel, locationValue);
                return Json(new { status = true, ReferenceNumber, type = "Submit" });
            }
            else
            {
                return Json(new { status = true, ReferenceNumber, type = "Save" });
            }
        }

        public int GetShiftedFromTo(string location)
        {
            try
            {
                var locationList = JsonConvert.DeserializeObject<List<JObject>>(location);

                int? districtValue = null;

                foreach (var item in locationList!)
                {
                    var name = item["name"]?.ToString();
                    var valueStr = item["value"]?.ToString();

                    if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(valueStr))
                        continue;

                    if (name == "Tehsil" && int.TryParse(valueStr, out int tehsil))
                    {
                        return tehsil; // Return immediately if Tehsil found
                    }

                    if (name == "District" && int.TryParse(valueStr, out int district))
                    {
                        districtValue = district; // Store District in case Tehsil not found
                    }
                }

                return districtValue ?? 0; // Return District if Tehsil wasn't found
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize location JSON.");
                return -1;
            }
        }


        [HttpPost]
        public async Task<IActionResult> UpdateApplicationDetails([FromForm] IFormCollection form)
        {
            string referenceNumber = form["referenceNumber"].ToString();
            string returnFieldsJson = form["returnFields"].ToString();
            string formDetailsJson = form["formDetails"].ToString();


            var returnFields = JsonConvert.DeserializeObject<List<string>>(returnFieldsJson) ?? new List<string>();
            var submittedFormDetails = JObject.Parse(formDetailsJson);

            // Fetch existing application
            var application = dbcontext.CitizenApplications.FirstOrDefault(a => a.ReferenceNumber == referenceNumber);
            if (application == null)
            {
                return Json(new { status = false, message = "Application not found" });
            }

            var existingFormDetails = JObject.Parse(application.FormDetails ?? "{}");

            var existingLocation = existingFormDetails["Location"];
            var submittedLocation = submittedFormDetails["Location"];

            int shiftedFrom = GetShiftedFromTo(JsonConvert.SerializeObject(existingLocation!));
            int shiftedTo = GetShiftedFromTo(JsonConvert.SerializeObject(submittedLocation!));

            _logger.LogInformation($"------------ Shifted From: {shiftedFrom}  Shifted To: {shiftedTo} --------------------------");

            // Helper function to get all file fields from a JObject (including nested additionalFields)
            static HashSet<string> GetFileFields(JObject formDetails)
            {
                var fileFields = new HashSet<string>();
                foreach (var section in formDetails.Properties())
                {
                    if (section.Value is JArray fields)
                    {
                        foreach (var field in fields.OfType<JObject>())
                        {
                            if (field.ContainsKey("File") && !string.IsNullOrEmpty(field["File"]?.ToString()))
                            {
                                fileFields.Add(field["name"]?.ToString() ?? "");
                            }
                            if (field["additionalFields"] is JArray additionalFields)
                            {
                                foreach (var nestedField in additionalFields.OfType<JObject>())
                                {
                                    if (nestedField.ContainsKey("File") && !string.IsNullOrEmpty(nestedField["File"]?.ToString()))
                                    {
                                        fileFields.Add(nestedField["name"]?.ToString() ?? "");
                                    }
                                }
                            }
                        }
                    }
                }
                return fileFields;
            }

            // Get file fields from existing and submitted formDetails
            var existingFileFields = GetFileFields(existingFormDetails);
            var submittedFileFields = GetFileFields(submittedFormDetails);

            // Delete files present in existingFormDetails but not in submittedFormDetails
            foreach (var fieldName in existingFileFields.Except(submittedFileFields))
            {
                var section = existingFormDetails.Properties()
                    .Select(p => new { Name = p.Name, Fields = p.Value as JArray })
                    .FirstOrDefault(s => s.Fields?.OfType<JObject>().Any(f => f["name"]?.ToString() == fieldName) == true);
                if (section != null)
                {
                    var field = section.Fields?.OfType<JObject>().FirstOrDefault(f => f["name"]?.ToString() == fieldName);
                    var filePath = field?["File"]?.ToString();
                    if (!string.IsNullOrEmpty(filePath))
                    {
                        _logger.LogInformation($"Deleting file for removed field {fieldName}: {filePath}");
                        helper.DeleteFile(filePath);
                    }
                }
            }

            // Process new files in form.Files and update submittedFormDetails
            foreach (var section in submittedFormDetails.Properties())
            {
                if (section.Value is not JArray fields) continue;
                foreach (var field in fields.OfType<JObject>())
                {
                    string fieldName = field["name"]?.ToString() ?? "";
                    if (string.IsNullOrEmpty(fieldName)) continue;

                    if (field.ContainsKey("File") || field.ContainsKey("Enclosure"))
                    {
                        var file = form.Files.FirstOrDefault(f => f.Name == fieldName);
                        if (file != null)
                        {
                            string filePath = await helper.GetFilePath(file);
                            field["File"] = filePath;
                            _logger.LogInformation($"Updated file path for {fieldName}: {filePath}");
                        }
                        else if (field["File"]?.Type == JTokenType.Object)
                        {
                            // If File is an empty object or invalid, set to empty string
                            field["File"] = "";
                        }
                    }

                    // Process additionalFields for nested files
                    if (field["additionalFields"] is JArray additionalFields)
                    {
                        foreach (var nestedField in additionalFields.OfType<JObject>())
                        {
                            string nestedFieldName = nestedField["name"]?.ToString() ?? "";
                            if (string.IsNullOrEmpty(nestedFieldName)) continue;

                            if (nestedField.ContainsKey("File") || nestedField.ContainsKey("Enclosure"))
                            {
                                var file = form.Files.FirstOrDefault(f => f.Name == nestedFieldName);
                                if (file != null)
                                {
                                    string filePath = await helper.GetFilePath(file);
                                    nestedField["File"] = filePath;
                                    _logger.LogInformation($"Updated file path for nested field {nestedFieldName}: {filePath}");
                                }
                                else if (nestedField["File"]?.Type == JTokenType.Object)
                                {
                                    nestedField["File"] = "";
                                }
                            }
                        }
                    }
                }
            }

            // // Update application.FormDetails with the new formDetails
            application.FormDetails = submittedFormDetails.ToString();
            application.AdditionalDetails = null;
            var workFlow = JsonConvert.DeserializeObject<JArray>(application.WorkFlow ?? "[]");
            var currentOfficer = workFlow!.FirstOrDefault(o => (int)o["playerId"]! == application.CurrentPlayer);
            if (currentOfficer != null)
            {
                currentOfficer["status"] = "pending";
                currentOfficer["shifted"] = true;
                currentOfficer["shiftedFrom"] = shiftedFrom;
                currentOfficer["shiftedTo"] = shiftedTo;
            }
            application.WorkFlow = JsonConvert.SerializeObject(workFlow);
            application.CreatedAt = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");


            string? locationLevel = GetFormFieldValue(submittedFormDetails, "Tehsil") != null ? "Tehsil" : "District";
            int locationValue = Convert.ToInt32(GetFormFieldValue(submittedFormDetails, locationLevel));


            dbcontext.SaveChanges();
            helper.InsertHistory(referenceNumber, "Corrected and Sent Back to Officer", "Citizen", "Corrected", locationLevel, locationValue);

            return Json(new { status = true, message = "Application updated successfully", type = "Edit", referenceNumber });
        }
    }
}
