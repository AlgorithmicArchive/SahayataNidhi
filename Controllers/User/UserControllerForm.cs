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

        public void ServiceSpecific(int ServiceId, JToken formDetails, string ReferenceNumber)
        {
            _logger.LogInformation($"--------- SERVICE ID: {ServiceId} ------------------------------");
            if (ServiceId == 1)
            {
                var KindOfDisability = FindFieldRecursively(formDetails, "KindOfDisability");
                if (KindOfDisability != null && (string)KindOfDisability!["value"]! == "TEMPORARY")
                {
                    string ExpirationDate = (string)FindFieldRecursively(formDetails, "IfTemporaryDisabilityUdidCardValidUpto")!["value"]!;
                    var expiringEligibility = new ApplicationsWithExpiringEligibility
                    {
                        ServiceId = ServiceId,
                        ExpirationDate = ExpirationDate,
                        ReferenceNumber = ReferenceNumber,
                    };
                    dbcontext.ApplicationsWithExpiringEligibilities.Add(expiringEligibility);
                    dbcontext.SaveChanges();
                }
            }
        }

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
            var formdetailsToken = JToken.Parse(formDetailsJson);

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
            int districtId = Convert.ToInt32(FindFieldRecursively(formdetailsToken, "District")!["value"]);

            if (string.IsNullOrEmpty(ReferenceNumber))
            {
                int count = GetCountPerDistrict(districtId, serviceId);
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
                var ReferenceNumberAlphaNumber = "JK-" + service.NameShort + "-" + districtShort + "/" + finYear + "/" + count;
                var random = new Random();
                ReferenceNumber = "01" + service.ServiceId.ToString("D2") + districtDetails.DistrictId.ToString("D2") + finYear.Split("-")[1] + random.Next(100, 1000) + count;

                var createdAt = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");

                // Store the updated JSON (with file paths) in the database.
                var newFormDetails = new CitizenApplication
                {
                    ReferenceNumber = ReferenceNumber,
                    ReferenceNumberAlphaNumeric = ReferenceNumberAlphaNumber,
                    CitizenId = userId,
                    ServiceId = serviceId,
                    DistrictUidForBank = null,
                    FormDetails = formDetailsObj.ToString(),
                    WorkFlow = workFlow!,
                    Status = status,
                    DataType = "new",
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
                try
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

                }
                catch (Exception ex)
                {
                    // Log the email sending error but continue execution
                    _logger.LogError(ex, $"Failed to send email for Reference: {ReferenceNumber}");
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

                // Retrieve the file from the database
                var fileResult = await DisplayFile(fullPath.Split('=')[1]);

                // Check if the file exists and is valid
                if (fileResult is not FileContentResult fileContentResult)
                {
                    _logger.LogWarning($"File not found or invalid for Reference: {ReferenceNumber}, Email: {email}");
                    // Handle the error appropriately (e.g., skip email sending or notify user)
                    return Json(new { status = false, message = "File not found or invalid" });
                }

                // Get the file data from FileContentResult
                byte[] fileData = fileContentResult.FileContents;
                string fileName = ReferenceNumber.Replace("/", "_") + "Acknowledgement.pdf";

                // Create a temporary file in the Temp directory
                string tempDir = Path.Combine(_webHostEnvironment.WebRootPath, "Temp");
                Directory.CreateDirectory(tempDir); // Ensure the Temp directory exists
                string tempFilePath = Path.Combine(tempDir, fileName);
                var attachments = new List<string>();

                try
                {
                    // Write the file data to a temporary PDF file
                    await System.IO.File.WriteAllBytesAsync(tempFilePath, fileData);
                    attachments.Add(tempFilePath);

                    // Send the email with the temporary PDF file as an attachment
                    await emailSender.SendEmailWithAttachments(email!, "Form Submission", htmlMessage, attachments);
                }
                catch (Exception ex)
                {
                    // Log the email sending error but continue execution
                    _logger.LogError(ex, $"Failed to send email for Reference: {ReferenceNumber}, Email: {email}");
                }
                finally
                {
                    // Clean up: Delete the temporary file
                    if (System.IO.File.Exists(tempFilePath))
                    {
                        try
                        {
                            System.IO.File.Delete(tempFilePath);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Failed to delete temporary file: {tempFilePath}");
                        }
                    }
                }
                string field = GetFormFieldValue(formDetailsObj, "Tehsil") != null ? "Tehsil" : "District";
                string? value = GetFormFieldValue(formDetailsObj, field);

                string? locationLevel = field;
                int locationValue = Convert.ToInt32(value);

                ServiceSpecific(serviceId, formdetailsToken, ReferenceNumber);



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

        [HttpPost]
        public async Task<IActionResult> UpdateExpiringDocumentDetails([FromForm] IFormCollection form)
        {
            try
            {
                string referenceNumber = form["referenceNumber"].ToString();
                if (string.IsNullOrWhiteSpace(referenceNumber))
                    return BadRequest("Reference number is required.");

                if (!int.TryParse(form["ServiceId"].ToString(), out int serviceId))
                    return BadRequest("Invalid service ID.");

                string remarks = form["remarks"].ToString();
                string? applicationId = form.ContainsKey("applicationId") && !string.IsNullOrWhiteSpace(form["applicationId"])
                    ? form["applicationId"].ToString()
                    : null;

                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
                if (service == null)
                    return BadRequest($"Service with ID {serviceId} not found.");

                var application = dbcontext.CitizenApplications.FirstOrDefault(a => a.ReferenceNumber == referenceNumber);
                if (application == null)
                    return BadRequest($"Application with reference number '{referenceNumber}' not found.");

                var workFlow = JArray.Parse(application.WorkFlow ?? "[]");

                // Parse formFields from FormDetails
                JToken formFields;
                try
                {
                    formFields = JToken.Parse(application.FormDetails ?? "{}");
                }
                catch (JsonException ex)
                {
                    return BadRequest($"Failed to parse FormFields: {ex.Message}");
                }

                var fieldsToCorrect = new[]
                {
                    "UdidCardIssueDate",
                    "PercentageOfDisability",
                    "IfTemporaryDisabilityUdidCardValidUpto",
                    "UdidCard"
                };

                // --- Get old values ---
                var oldValues = new JObject();
                foreach (var fieldName in fieldsToCorrect)
                {
                    var field = FindFieldRecursively(formFields, fieldName);
                    oldValues[fieldName] = field?["value"]?.ToString() ?? null;
                }

                // --- Get new values except UdidCard (handled separately) ---
                var newValues = new JObject();
                foreach (var fieldName in fieldsToCorrect.Except(new[] { "UdidCard" }))
                {
                    newValues[fieldName] = form[fieldName].ToString();
                }

                // --- Handle UdidCard file ---
                string? udidCardFileName = null;

                // 1. Uploaded new file
                if (form.Files != null && form.Files.Any(f => f.Name == "UdidCard" && f.Length > 0))
                {
                    var udidCardFile = form.Files.First(f => f.Name == "UdidCard");
                    string filePath = await helper.GetFilePath(udidCardFile); // Full path
                    udidCardFileName = Path.GetFileName(filePath); // Store only filename
                }

                // 2. Or server existing file
                if (string.IsNullOrWhiteSpace(udidCardFileName) && form.Keys.Any(k => k == "serverFiles[UdidCard]"))
                {
                    string serverFile = form["serverFiles[UdidCard]"].ToString();
                    if (!string.IsNullOrWhiteSpace(serverFile))
                        udidCardFileName = serverFile;
                }

                // Set new value for UdidCard
                newValues["UdidCard"] = udidCardFileName;

                // --- Build corrigendumFields ---
                var corrigendumFields = new JObject();
                foreach (var fieldName in fieldsToCorrect)
                {
                    corrigendumFields[fieldName] = new JObject
                    {
                        ["old_value"] = oldValues[fieldName],
                        ["new_value"] = newValues[fieldName],
                        ["additional_values"] = new JObject()
                    };
                }

                corrigendumFields["Files"] = new JObject
                {
                    ["TSWO"] = new JArray(udidCardFileName ?? string.Empty),
                    ["DSWO"] = new JArray()
                };

                // Parse location from FormDetails
                JObject formDetails;
                try
                {
                    formDetails = JObject.Parse(application.FormDetails ?? "{}");
                }
                catch (JsonException ex)
                {
                    return BadRequest($"Failed to parse FormDetails: {ex.Message}");
                }

                if (!formDetails.TryGetValue("Location", out JToken? locationToken) || locationToken.Type == JTokenType.Null)
                    return BadRequest("'Location' property is missing or null in FormDetails.");

                string location = locationToken.ToString();

                // Parse OfficerEditableField for workflow
                JArray players;
                try
                {
                    players = JArray.Parse(service.OfficerEditableField ?? "[]");
                }
                catch (JsonException ex)
                {
                    return BadRequest($"Failed to parse OfficerEditableField: {ex.Message}");
                }

                if (players.Count == 0)
                    return Json(new { status = false, message = "No workflow players defined for this service." });

                string? corrigendumNumber = "";

                // --- If updating existing corrigendum ---
                if (applicationId != null)
                {
                    var corrigendum = dbcontext.Corrigenda.FirstOrDefault(c => c.CorrigendumId == applicationId && c.Type == "Corrigendum");
                    if (corrigendum == null)
                        return BadRequest($"Corrigendum with ID {applicationId} not found.");

                    corrigendum.CorrigendumFields = corrigendumFields.ToString(Formatting.None);

                    // Update workflow
                    JArray corrigendumWorkFlow = JArray.Parse(corrigendum.WorkFlow ?? "[]");
                    int currentPlayerIndex = corrigendum.CurrentPlayer;

                    corrigendumWorkFlow[currentPlayerIndex]["status"] = "forwarded";
                    corrigendumWorkFlow[currentPlayerIndex]["canPull"] = "true";
                    corrigendumWorkFlow[currentPlayerIndex]["remarks"] = remarks;
                    corrigendumWorkFlow[currentPlayerIndex]["completedAt"] = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");

                    if (currentPlayerIndex + 1 < corrigendumWorkFlow.Count)
                    {
                        corrigendumWorkFlow[currentPlayerIndex + 1]["status"] = "pending";
                        corrigendumWorkFlow[currentPlayerIndex + 1]["remarks"] = "";
                        corrigendumWorkFlow[currentPlayerIndex + 1]["completedAt"] = "";
                        corrigendum.CurrentPlayer = currentPlayerIndex + 1;
                    }

                    corrigendum.WorkFlow = JsonConvert.SerializeObject(corrigendumWorkFlow);

                    // Update history
                    List<dynamic> history = JsonConvert.DeserializeObject<List<dynamic>>(corrigendum.History ?? "[]") ?? new List<dynamic>();
                    history.Add(new
                    {
                        actionTaker = "Tehsil Social Welfare Officer" + " " + GetOfficerArea("Tehsil Social Welfare Officer", formDetails),
                        status = "forwarded",
                        remarks = remarks,
                        actionTakenOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
                    });

                    corrigendum.History = JsonConvert.SerializeObject(history);
                    corrigendum.Type = "Corrigendum";

                    dbcontext.Corrigenda.Update(corrigendum);
                    corrigendumNumber = corrigendum.CorrigendumId;
                }
                else
                {
                    // Create new corrigendum
                    var locationObj = JArray.Parse(location);
                    int districtId = Convert.ToInt32(locationObj.First(l => l["name"]!.ToString() == "District")!["value"]);
                    var finYear = helper.GetCurrentFinancialYear();
                    var districtDetails = dbcontext.Districts.FirstOrDefault(s => s.DistrictId == districtId);
                    string districtShort = districtDetails!.DistrictShort!;
                    int count = GetCountPerDistrict(districtId, serviceId, "Corrigendum");

                    corrigendumNumber = $"JK-{service.NameShort}-{districtShort}-CRG/{finYear}/{count}";

                    var filteredWorkflow = new JArray();
                    foreach (var player in players)
                    {
                        var filteredPlayer = new JObject
                        {
                            ["designation"] = player["designation"],
                            ["status"] = player["status"],
                            ["completedAt"] = player["completedAt"],
                            ["remarks"] = player["remarks"],
                            ["playerId"] = player["playerId"],
                            ["prevPlayerId"] = player["prevPlayerId"],
                            ["nextPlayerId"] = player["nextPlayerId"],
                            ["canPull"] = true
                        };
                        filteredWorkflow.Add(filteredPlayer);
                    }

                    if (filteredWorkflow.Count > 0)
                    {
                        filteredWorkflow[0]["status"] = "pending";
                        filteredWorkflow[0]["remarks"] = "";
                        filteredWorkflow[0]["completedAt"] = "";
                    }

                    var workFlowJson = JsonConvert.SerializeObject(filteredWorkflow);

                    var historyEntry = new
                    {
                        actionTaker = "Citizen",
                        status = "Correction Submitted",
                        remarks = "Correction Submitted",
                        actionTakenOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
                    };

                    var corrigendum = new Corrigendum
                    {
                        CorrigendumId = corrigendumNumber,
                        ReferenceNumber = referenceNumber,
                        Location = location,
                        CorrigendumFields = JsonConvert.SerializeObject(corrigendumFields),
                        WorkFlow = workFlowJson,
                        CurrentPlayer = 0,
                        History = JsonConvert.SerializeObject(new List<dynamic> { historyEntry }),
                        Status = "Initiated",
                        Type = "Corrigendum"
                    };

                    dbcontext.Corrigenda.Add(corrigendum);
                }

                dbcontext.SaveChanges();

                return Json(new
                {
                    status = true,
                    message = applicationId != null
                        ? $"Corrigendum updated with No. {corrigendumNumber} successfully."
                        : $"Corrigendum with No. {corrigendumNumber} forwarded successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"An error occurred: {ex.Message}" });
            }
        }



    }
}
