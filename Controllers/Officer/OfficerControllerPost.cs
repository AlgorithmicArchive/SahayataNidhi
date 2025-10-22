using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;
using Microsoft.Data.SqlClient; // SqlParameter, SqlException (recommended for .NET Core)
using System.Data;              // IDataParameter, DbType, etc. (optional but handy)
using System.Threading.Tasks;   // Task
using Microsoft.Extensions.Logging;
using System.Text;
using System.Xml;
using Formatting = Newtonsoft.Json.Formatting;
using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.Authorization; // ILogger<T>


namespace SahayataNidhi.Controllers.Officer
{
    public partial class OfficerController : Controller
    {
        public IActionResult UpdatePool(int ServiceId, string list)
        {
            var officer = GetOfficerDetails();
            var PoolList = dbcontext.Pool.FirstOrDefault(p => p.ServiceId == Convert.ToInt32(ServiceId) && p.ListType == "Pool" && p.AccessLevel == officer.AccessLevel && p.AccessCode == officer.AccessCode);
            var pool = PoolList != null && !string.IsNullOrWhiteSpace(PoolList!.List) ? JsonConvert.DeserializeObject<List<string>>(PoolList.List) : [];
            var poolList = JsonConvert.DeserializeObject<List<string>>(list);
            foreach (var item in poolList!)
            {
                pool!.Add(item);
            }

            if (PoolList == null)
            {
                var newPool = new Pool
                {
                    ServiceId = ServiceId,
                    AccessLevel = officer.AccessLevel!,
                    AccessCode = (int)officer.AccessCode!,
                    List = JsonConvert.SerializeObject(pool),
                    ListType = "Pool"
                };
                dbcontext.Pool.Add(newPool);
            }
            else
                PoolList!.List = JsonConvert.SerializeObject(pool);

            dbcontext.SaveChanges();
            return Json(new { status = true, ServiceId, list });
        }

        [HttpPost]
        public async Task<IActionResult> UpdatePdf([FromForm] IFormCollection form)
        {
            _logger.LogInformation($"Form: {form} ApplicationID: {form["applicationId"]}");

            if (form == null || !form.Files.Any() || string.IsNullOrEmpty(form["applicationId"]))
            {
                return BadRequest(new { status = false, response = "Missing form data." });
            }

            var signedPdf = form.Files["signedPdf"];
            var applicationId = form["applicationId"].ToString();

            if (signedPdf == null || signedPdf.Length == 0)
            {
                return BadRequest(new { status = false, response = "No file uploaded." });
            }

            try
            {
                // Construct the file name based on applicationId
                string fileName = applicationId.Replace("/", "_") + "_SanctionLetter.pdf";

                // Read the file into a byte array
                using var memoryStream = new MemoryStream();
                await signedPdf.CopyToAsync(memoryStream);
                var fileData = memoryStream.ToArray();

                // Check if the file exists in UserDocuments
                var existingFile = await dbcontext.UserDocuments
                    .FirstOrDefaultAsync(f => f.FileName == fileName);

                if (existingFile != null)
                {
                    // Update existing record
                    existingFile.FileData = fileData;
                    existingFile.FileType = "application/pdf";
                    existingFile.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new record
                    dbcontext.UserDocuments.Add(new UserDocuments
                    {
                        FileName = fileName,
                        FileData = fileData,
                        FileType = "application/pdf",
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                await dbcontext.SaveChangesAsync();

                return Json(new { status = true, path = fileName });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, response = $"An error occurred while updating the sanction letter: {ex.Message}" });
            }
        }

        public async Task<IActionResult> SubmitDocumentChange(IFormCollection form)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return Unauthorized("Officer details not found.");
                }

                string type = form["type"].ToString();
                if (string.IsNullOrWhiteSpace(type) || !new[] { "Corrigendum", "Correction", "Amendment" }.Contains(type))
                {
                    return BadRequest("Invalid or missing type. Must be 'Corrigendum', 'Correction', or 'Amendment'.");
                }

                // Initialize lists for files
                List<string> Files = new List<string>();
                List<string> enclosureFiles = new List<string>(); // New list for enclosure field files

                // Process verification documents from form.Files
                if (form.Files != null && form.Files.Count > 0)
                {
                    foreach (var formFile in form.Files)
                    {
                        if (formFile.Length > 0)
                        {
                            string filePath = await helper.GetFilePath(formFile);
                            Files.Add(filePath);
                        }
                    }
                }

                // Process server files
                List<string> serverFiles = new List<string>();
                foreach (var key in form.Keys)
                {
                    if (key.StartsWith("serverFiles[") && key.EndsWith("]"))
                    {
                        string fileName = form[key].ToString();
                        if (!string.IsNullOrWhiteSpace(fileName))
                        {
                            serverFiles.Add(fileName);
                        }
                    }
                }

                string referenceNumber = form["referenceNumber"].ToString();
                if (string.IsNullOrWhiteSpace(referenceNumber))
                {
                    return BadRequest("Reference number is required.");
                }

                if (!int.TryParse(form["serviceId"].ToString(), out int serviceId))
                {
                    return BadRequest("Invalid service ID.");
                }

                string remarks = form["remarks"].ToString();
                string corrigendumFieldsJson = form["corrigendumFields"].ToString();
                if (string.IsNullOrWhiteSpace(corrigendumFieldsJson))
                {
                    return BadRequest($"{type} fields are required.");
                }

                string? applicationId = form.ContainsKey("applicationId") && !string.IsNullOrWhiteSpace(form["applicationId"]) ? form["applicationId"].ToString() : null;

                JObject newCorrigendumFields;
                try
                {
                    newCorrigendumFields = JsonConvert.DeserializeObject<JObject>(corrigendumFieldsJson)!;
                }
                catch (JsonException)
                {
                    return BadRequest($"Invalid {type.ToLower()} fields JSON format.");
                }

                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);
                if (service == null)
                {
                    return BadRequest($"Service with ID {serviceId} not found.");
                }

                var application = dbcontext.CitizenApplications.FirstOrDefault(a => a.ReferenceNumber == referenceNumber);
                if (application == null)
                {
                    return BadRequest($"Application with reference number '{referenceNumber}' not found.");
                }

                if (type == "Correction")
                {
                    var workFlow = JArray.Parse(application.WorkFlow ?? "[]");
                    if (workFlow.Count <= application.CurrentPlayer || workFlow[application.CurrentPlayer!]!["designation"]?.ToString() != officer.Role)
                    {
                        return Json(new { status = false, message = "You are not the current officer authorized to perform a Correction." });
                    }
                }

                JObject formDetailsJObject;
                try
                {
                    formDetailsJObject = JObject.Parse(application.FormDetails!)!;
                }
                catch (JsonException ex)
                {
                    return BadRequest($"Failed to deserialize form details for application with reference number '{referenceNumber}': {ex.Message}");
                }

                if (!formDetailsJObject.TryGetValue("Location", out JToken? locationToken) || locationToken.Type == JTokenType.Null)
                {
                    return BadRequest($"'Location' property is missing or null in form details for application with reference number '{referenceNumber}'.");
                }

                string location = locationToken.ToString();

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
                {
                    return Json(new { status = false, message = "No workflow players defined for this service." });
                }

                // Process enclosure fields in corrigendumFields
                foreach (var prop in newCorrigendumFields.Properties())
                {
                    if (prop.Name != "Files")
                    {
                        var field = prop.Value as JObject;
                        if (field != null && field["type"]?.ToString() == "enclosure")
                        {
                            string fileName = field["new_value"]?.ToString()!;
                            if (!string.IsNullOrWhiteSpace(fileName))
                            {
                                // Find the corresponding file in form.Files
                                var matchingFile = form.Files!.FirstOrDefault(f => Path.GetFileName(f.FileName) == fileName);
                                if (matchingFile != null && matchingFile.Length > 0)
                                {
                                    string filePath = await helper.GetFilePath(matchingFile);
                                    enclosureFiles.Add(filePath);
                                    field["new_value"] = Path.GetFileName(filePath); // Ensure new_value is just the filename
                                }
                                else if (!serverFiles.Contains(fileName))
                                {
                                    return BadRequest($"File '{fileName}' for field '{prop.Name}' not found in uploaded files or server files.");
                                }
                            }
                        }
                    }
                }

                string? CorrigendumNumber = "";

                if (applicationId != null)
                {
                    var corrigendum = dbcontext.Corrigendum.FirstOrDefault(c => c.CorrigendumId == applicationId && c.Type == type);
                    if (corrigendum == null)
                    {
                        return BadRequest($"{type} with ID {applicationId} not found.");
                    }
                    var corrigendumFields = JObject.Parse(corrigendum.CorrigendumFields ?? "{}");

                    foreach (var prop in newCorrigendumFields.Properties())
                    {
                        if (prop.Name != "Files")
                        {
                            corrigendumFields[prop.Name] = prop.Value;
                        }
                    }

                    if (corrigendumFields["Files"] is not JObject corrigendumFiles)
                    {
                        corrigendumFiles = new JObject();
                        corrigendumFields["Files"] = corrigendumFiles;
                    }

                    var combinedFiles = Files.Select(Path.GetFileName).Concat(enclosureFiles.Select(Path.GetFileName)).Concat(serverFiles).Distinct().ToList();
                    corrigendumFiles[officer.RoleShort!] = new JArray(combinedFiles);

                    corrigendum.CorrigendumFields = corrigendumFields.ToString(Formatting.None);

                    JArray workFlow;
                    try
                    {
                        workFlow = JArray.Parse(corrigendum.WorkFlow ?? "[]");
                    }
                    catch (JsonException ex)
                    {
                        return BadRequest($"Failed to parse existing workflow: {ex.Message}");
                    }

                    if (workFlow.Count == 0)
                    {
                        return BadRequest("Existing workflow is empty.");
                    }

                    int currentPlayerIndex = corrigendum.CurrentPlayer;
                    if (currentPlayerIndex < 0 || currentPlayerIndex >= workFlow.Count)
                    {
                        return BadRequest("Invalid current player index.");
                    }

                    workFlow[currentPlayerIndex]["status"] = "forwarded";
                    workFlow[currentPlayerIndex]["canPull"] = "true";
                    workFlow[currentPlayerIndex]["remarks"] = remarks;
                    workFlow[currentPlayerIndex]["completedAt"] = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt", CultureInfo.InvariantCulture);

                    if (currentPlayerIndex + 1 < workFlow.Count)
                    {
                        workFlow[currentPlayerIndex + 1]["status"] = "pending";
                        workFlow[currentPlayerIndex + 1]["remarks"] = "";
                        workFlow[currentPlayerIndex + 1]["completedAt"] = "";
                        corrigendum.CurrentPlayer = currentPlayerIndex + 1;
                    }

                    corrigendum.WorkFlow = JsonConvert.SerializeObject(workFlow);

                    List<dynamic> history;
                    try
                    {
                        history = JsonConvert.DeserializeObject<List<dynamic>>(corrigendum.History ?? "[]") ?? new List<dynamic>();
                    }
                    catch (JsonException ex)
                    {
                        return BadRequest($"Failed to parse existing history: {ex.Message}");
                    }

                    var newHistoryEntry = new
                    {
                        actionTaker = officer.Role + " " + GetOfficerArea(officer.AccessLevel!, formDetailsJObject),
                        status = "forwarded",
                        remarks = remarks,
                        actionTakenOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
                    };

                    history.Add(newHistoryEntry);
                    corrigendum.History = JsonConvert.SerializeObject(history);
                    corrigendum.Type = type;

                    dbcontext.Corrigendum.Update(corrigendum);
                    CorrigendumNumber = corrigendum.CorrigendumId;
                }
                else
                {
                    var Location = formDetailsJObject["Location"];
                    int DistrictId = Convert.ToInt32(Location!.FirstOrDefault(l => l["name"]!.ToString() == "District")!["value"]);
                    var finYear = helper.GetCurrentFinancialYear();
                    var districtDetails = dbcontext.District.FirstOrDefault(s => s.DistrictId == DistrictId);
                    string districtShort = districtDetails!.DistrictShort!;
                    int count = GetCountPerDistrict(DistrictId, serviceId);

                    var random = new Random();
                    var rnd = random.Next(100, 1000); // 100..999

                    string typeCode = type switch
                    {
                        "Corrigendum" => "01",
                        "Correction" => "02",
                        "Amendment" => "03",
                        _ => throw new ArgumentException("Invalid type")
                    };

                    string corrigendumNumber = string.Format(
                        "01{0:D2}{1:D2}{2}{3}{4:D3}{5:D2}",
                        service.ServiceId,
                        districtDetails.DistrictId,
                        typeCode,
                        finYear.Split('-')[1],
                        rnd,
                        count
                    );
                    CorrigendumNumber = corrigendumNumber;

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
                        filteredWorkflow[0]["status"] = "forwarded";
                        filteredWorkflow[0]["remarks"] = remarks;
                        filteredWorkflow[0]["completedAt"] = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");
                        if (filteredWorkflow.Count > 1)
                        {
                            filteredWorkflow[1]["status"] = "pending";
                        }
                    }

                    var workFlow = JsonConvert.SerializeObject(filteredWorkflow);
                    var history = new
                    {
                        officer = officer.Role + " " + GetOfficerArea(officer.AccessLevel!, formDetailsJObject),
                        status = "Forwarded",
                        remarks = remarks,
                        actionTakenOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
                    };

                    List<dynamic> History = new List<dynamic> { history };
                    var corrigendumFields = JObject.Parse(corrigendumFieldsJson);
                    corrigendumFields["Files"] = new JObject
                    {
                        [officer.RoleShort!] = new JArray(Files.Select(Path.GetFileName).Concat(enclosureFiles.Select(Path.GetFileName)).Concat(serverFiles).Distinct())
                    };

                    var corrigendum = new Corrigendum
                    {
                        CorrigendumId = CorrigendumNumber,
                        ReferenceNumber = referenceNumber,
                        Location = location,
                        CorrigendumFields = JsonConvert.SerializeObject(corrigendumFields),
                        WorkFlow = workFlow,
                        CurrentPlayer = filteredWorkflow.Count > 1 ? 1 : 0,
                        History = JsonConvert.SerializeObject(History),
                        Status = "Initiated",
                        Type = type
                    };

                    dbcontext.Corrigendum.Add(corrigendum);
                }

                dbcontext.SaveChanges();

                return Json(new
                {
                    status = true,
                    message = applicationId != null ? $"{type} updated with No. {CorrigendumNumber} successfully." : $"{type} with No. {CorrigendumNumber} forwarded successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    status = false,
                    message = $"An error occurred: {ex.Message}"
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> HandleCorrigendumAction([FromForm] IFormCollection form)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return Unauthorized("Officer details not found.");
                }

                string type = form["type"].ToString();
                if (string.IsNullOrWhiteSpace(type) || !new[] { "Corrigendum", "Correction", "Amendment" }.Contains(type))
                {
                    return BadRequest("Invalid or missing type. Must be 'Corrigendum', 'Correction', or 'Amendment'.");
                }

                var referenceNumber = form["referenceNumber"].ToString();
                var action = form["action"].ToString();
                var remarks = form["remarks"].ToString();
                var corrigendumId = form["corrigendumId"].ToString();

                List<string> Files = new List<string>();
                if (form.Files != null && form.Files.Count > 0)
                {
                    foreach (var formFile in form.Files)
                    {
                        if (formFile.Length > 0)
                        {
                            string filePath = await helper.GetFilePath(formFile);
                            Files.Add(filePath);
                        }
                    }
                }

                var corrigendum = dbcontext.Corrigendum
                    .FirstOrDefault(c => c.ReferenceNumber == referenceNumber && c.CorrigendumId == corrigendumId && c.Type == type);
                if (corrigendum == null)
                {
                    return NotFound($"{type} not found.");
                }

                var CitizenApplications = dbcontext.CitizenApplications
                    .FirstOrDefault(c => c.ReferenceNumber == referenceNumber);
                if (CitizenApplications == null)
                {
                    return NotFound("Citizen application not found.");
                }

                if (type == "Correction")
                {
                    var workFlow = JArray.Parse(corrigendum.WorkFlow ?? "[]");
                    if (workFlow.Count <= corrigendum.CurrentPlayer || workFlow[corrigendum.CurrentPlayer]["designation"]?.ToString() != officer.Role)
                    {
                        return Json(new { status = false, message = "You are not the current officer authorized to handle this Correction." });
                    }
                }

                var formDetails = JObject.Parse(CitizenApplications.FormDetails!);

                int currentPlayer = corrigendum.CurrentPlayer;
                var workFlowCorrigendum = JArray.Parse(corrigendum.WorkFlow ?? "[]");
                if (workFlowCorrigendum.Count > 0)
                {
                    if (action == "forward")
                    {
                        workFlowCorrigendum[currentPlayer]["status"] = "forwarded";
                        workFlowCorrigendum[currentPlayer]["canPull"] = true;
                        if (currentPlayer + 1 < workFlowCorrigendum.Count)
                        {
                            workFlowCorrigendum[currentPlayer + 1]["status"] = "pending";
                            corrigendum.CurrentPlayer = currentPlayer + 1;
                        }
                    }
                    else if (action == "sanction")
                    {
                        workFlowCorrigendum[currentPlayer]["status"] = "sanctioned";
                        corrigendum.Status = "Sanctioned";
                    }
                    else if (action == "return")
                    {
                        workFlowCorrigendum[currentPlayer]["status"] = "returned";
                        workFlowCorrigendum[currentPlayer]["canPull"] = true;
                        if (currentPlayer > 0)
                        {
                            workFlowCorrigendum[currentPlayer - 1]["status"] = "pending";
                            workFlowCorrigendum[currentPlayer - 1]["remarks"] = "";
                            workFlowCorrigendum[currentPlayer - 1]["completedAt"] = "";
                            corrigendum.CurrentPlayer = currentPlayer - 1;
                        }
                    }
                    else if (action == "verified")
                    {
                        workFlowCorrigendum[currentPlayer]["status"] = "verified";
                        corrigendum.Status = "Verified";
                    }
                    else if (action == "reject")
                    {
                        workFlowCorrigendum[currentPlayer]["status"] = "rejected";
                        corrigendum.Status = "Rejected";
                    }
                    workFlowCorrigendum[currentPlayer]["remarks"] = remarks;
                    workFlowCorrigendum[currentPlayer]["completedAt"] = DateTime.Now.ToString("dd MMMM yyyy hh:mm:ss tt");
                    corrigendum.WorkFlow = workFlowCorrigendum.ToString(Formatting.None);
                }

                var corrigendumHistory = JsonConvert.DeserializeObject<List<dynamic>>(corrigendum.History ?? "[]");
                var newCorrigendumHistory = new
                {
                    actionTaker = officer.Role + " " + GetOfficerArea(officer.AccessLevel!, formDetails),
                    status = action,
                    remarks = remarks,
                    actionTakenOn = DateTime.Now.ToString("dd MMMM yyyy hh:mm:ss tt"),
                };
                corrigendumHistory!.Add(newCorrigendumHistory);
                corrigendum.History = JsonConvert.SerializeObject(corrigendumHistory);

                var corrigendumFields = JObject.Parse(corrigendum.CorrigendumFields);
                if (corrigendumFields["Files"] is not JObject filesObj)
                {
                    filesObj = new JObject();
                    corrigendumFields["Files"] = filesObj;
                }

                if (corrigendumFields["IfTemporaryDisabilityUdidCardValidUpto"] is JObject fieldObj)
                {
                    var newValue = fieldObj["new_value"]?.ToString();

                    if (!string.IsNullOrWhiteSpace(newValue))
                    {
                        var expiring = dbcontext.ApplicationsWithExpiringEligibility
                            .FirstOrDefault(ae => ae.ReferenceNumber == referenceNumber);

                        if (expiring != null)
                        {
                            expiring.ExpirationDate = newValue;
                            dbcontext.SaveChanges();
                        }
                        else
                        {
                            _logger.LogWarning($"No expiring eligibility found for reference {referenceNumber}.");
                        }
                    }
                    else
                    {
                        _logger.LogWarning($"Field 'new_value' is null or empty for 'IfTemporaryDisabilityUdidCardValidUpto'.");
                    }
                }

                var roleKey = officer.RoleShort!;
                var newFiles = new JArray(Files.Select(Path.GetFileName));
                if (filesObj[roleKey] is JArray existingFiles)
                {
                    foreach (var file in Files)
                    {
                        existingFiles.Add(file);
                    }
                }
                else
                {
                    filesObj[roleKey] = newFiles;
                }
                try
                {
                    var getServices = dbcontext.WebService.FirstOrDefault(ws => ws.ServiceId == CitizenApplications.ServiceId && ws.IsActive);
                    if (getServices != null)
                    {
                        var onAction = JsonConvert.DeserializeObject<List<string>>(getServices.OnAction);
                        if (onAction != null && onAction.Contains(action))
                        {
                            // Create payload from corrigendumFields
                            var corrigendumPayload = new Dictionary<string, string>();
                            var corrigendumFieldsObj = JObject.Parse(corrigendum.CorrigendumFields);
                            foreach (var field in corrigendumFieldsObj.Properties())
                            {
                                var FieldObj = field.Value as JObject;
                                if (FieldObj != null)
                                {
                                    var name = FieldObj["name"]?.ToString();
                                    var newValue = FieldObj["new_value"]?.ToString();
                                    if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(newValue))
                                    {
                                        corrigendumPayload[name] = newValue;
                                    }
                                }
                            }

                            // Send API request with the corrigendumFields payload
                            await SendApiRequestAsync(getServices.ApiEndPoint, corrigendumPayload);
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Optional: log the error
                    Console.WriteLine("Error in external service call: " + ex.Message);
                    // Or use a logger: _logger.LogError(ex, "Service call failed");
                }
                corrigendum.CorrigendumFields = corrigendumFields.ToString(Formatting.None);
                corrigendum.Type = type;

                dbcontext.Corrigendum.Update(corrigendum);
                dbcontext.SaveChanges();

                return Json(new { status = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, response = ex.Message });
            }
        }
        [HttpPost]
        public async Task<IActionResult> UpdateCorrigendumPdf([FromForm] IFormCollection form)
        {
            try
            {
                _logger.LogInformation($"----------------- IS Form NULL : {form == null} IS File Available :{form!.Files.Any()} IS Refernce Number Empty: {string.IsNullOrEmpty(form["referenceNumber"])} IS Corrigendum : {string.IsNullOrEmpty(form["corrigendumId"])} IS Type : {string.IsNullOrEmpty(form["type"])} ---------------------------");
                if (form == null || !form.Files.Any() || string.IsNullOrEmpty(form["referenceNumber"]) || string.IsNullOrEmpty(form["corrigendumId"]) || string.IsNullOrEmpty(form["type"]))
                {
                    _logger.LogInformation("---------------- Missing form data for UpdateCorrigendumPdf. Form: {Form} -----------------------", form);
                    return BadRequest(new { status = false, response = "Missing form data, file, or type." });
                }

                string type = form["type"].ToString();
                if (type != "Corrigendum" && type != "Correction" && type != "Amendment")
                {
                    return BadRequest("Invalid type. Must be 'Corrigendum' or 'Correction' or 'Amendment'.");
                }

                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    _logger.LogWarning("Officer details not found for applicationId: {ApplicationId}, corrigendumId: {CorrigendumId}", form["applicationId"], form["corrigendumId"]);
                    return Unauthorized(new { status = false, response = "Officer details not found." });
                }


                var signedPdf = form.Files["signedPdf"];
                var applicationId = form["referenceNumber"].ToString();
                var corrigendumId = form["corrigendumId"].ToString();

                if (signedPdf == null || signedPdf.Length == 0)
                {
                    _logger.LogWarning("No signed PDF uploaded for applicationId: {ApplicationId}, corrigendumId: {CorrigendumId}", applicationId, corrigendumId);
                    return BadRequest(new { status = false, response = "Signed PDF is required." });
                }

                if (signedPdf.ContentType != "application/pdf")
                {
                    _logger.LogWarning("Invalid file type uploaded for applicationId: {ApplicationId}, corrigendumId: {CorrigendumId}. Expected application/pdf, got {ContentType}", applicationId, corrigendumId, signedPdf.ContentType);
                    return BadRequest(new { status = false, response = "Invalid file type. Only PDF files are allowed." });
                }

                var corrigendum = await dbcontext.Corrigendum
                    .FirstOrDefaultAsync(c => c.ReferenceNumber == applicationId && c.CorrigendumId == corrigendumId && c.Type == type);
                if (corrigendum == null)
                {
                    _logger.LogWarning("{Type} not found for applicationId: {ApplicationId}, corrigendumId: {CorrigendumId}", type, applicationId, corrigendumId);
                    return NotFound(new { status = false, response = $"{type} not found." });
                }

                if (type == "Correction")
                {
                    var workFlow = JArray.Parse(corrigendum.WorkFlow ?? "[]");
                    if (workFlow.Count <= corrigendum.CurrentPlayer || workFlow[corrigendum.CurrentPlayer]["role"]?.ToString() != officer.Role)
                    {
                        return Json(new { status = false, message = "You are not the current officer authorized to update this Correction PDF." });
                    }
                }

                var fileName = corrigendumId.Replace("/", "_") + $"_{type}SanctionLetter.pdf";
                using var memoryStream = new MemoryStream();
                await signedPdf.CopyToAsync(memoryStream);
                var fileData = memoryStream.ToArray();

                var existingFile = await dbcontext.UserDocuments
                    .FirstOrDefaultAsync(f => f.FileName == fileName);
                if (existingFile != null)
                {
                    existingFile.FileData = fileData;
                    existingFile.FileType = "application/pdf";
                    existingFile.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    dbcontext.UserDocuments.Add(new UserDocuments
                    {
                        FileName = fileName,
                        FileData = fileData,
                        FileType = "application/pdf",
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                var workFlowCorrigendum = JArray.Parse(corrigendum.WorkFlow ?? "[]");
                if (workFlowCorrigendum.Count > 0)
                {
                    workFlowCorrigendum[corrigendum.CurrentPlayer]["status"] = "sanctioned";
                    workFlowCorrigendum[corrigendum.CurrentPlayer]["completedAt"] = DateTime.UtcNow.ToString("dd MMMM yyyy hh:mm:ss tt");
                    corrigendum.WorkFlow = workFlowCorrigendum.ToString(Formatting.None);
                    corrigendum.Status = "Sanctioned";
                }

                dbcontext.Corrigendum.Update(corrigendum);
                await dbcontext.SaveChangesAsync();

                _logger.LogInformation("{Type} PDF updated and status set to sanctioned for applicationId: {ApplicationId}, corrigendumId: {CorrigendumId}", type, applicationId, corrigendumId);

                return Json(new { status = true, path = fileName });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating {Type} PDF for applicationId: {ApplicationId}, corrigendumId: {CorrigendumId}", form["type"], form["applicationId"], form["corrigendumId"]);
                return StatusCode(500, new { status = false, response = $"An error occurred while updating the {form["type"]} PDF: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SendExpirationEmail([FromForm] IFormCollection form)
        {
            try
            {
                string referenceNumber = form["referenceNumber"].ToString();
                string expirationDate = form["expirationDate"].ToString();
                var application = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);
                var formDetailsJson = JObject.Parse(application!.FormDetails!);
                string email = GetFieldValue("Email", formDetailsJson);
                string applicantName = GetFieldValue("ApplicantName", formDetailsJson);
                DateTime parsedExpirationDate = DateTime.ParseExact(
                    expirationDate,
                    "dd/MM/yyyy",
                    CultureInfo.InvariantCulture
                );
                string htmlMessage = $@"
            <div style='font-family: Arial, sans-serif;'>
                <h2 style='color: #2e6c80;'>UDID Card Validity Expiring</h2>
                <p><strong>{applicantName}</strong>,</p>
                <p>
                    This is a reminder that your UDID Card linked to application reference number 
                    <strong>{referenceNumber}</strong> is expiring on <strong>{parsedExpirationDate.ToString("dd MMM yyyy")}</strong>.
                </p>
                <p>
                    Please renew your UDID card and update your application if a new one has been issued.
                    This is necessary to continue receiving financial assistance without interruption.
                </p>
                <p>
                    You can log into the citizen portal and update your UDID card details at your earliest convenience.
                </p>
                <p>
                    If you've already renewed your UDID card, kindly ignore this message.
                </p>
                <br />
                <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
            </div>";

                var expiringApplications = dbcontext.ApplicationsWithExpiringEligibility.FirstOrDefault(a => a.ReferenceNumber == referenceNumber);
                expiringApplications!.MailSent = expiringApplications.MailSent + 1;
                dbcontext.SaveChanges();

                await emailSender.SendEmail(email, "Important: UDID Card Validity Expiring", htmlMessage);

                return Json(new { status = true, message = "Email Sent Successfully" });
            }
            catch (System.Exception)
            {
                throw;
            }

        }

        [HttpPost]
        public async Task<IActionResult> CreateWithheldApplication([FromForm] IFormCollection form)
        {
            try
            {
                var officer = GetOfficerDetails();

                // 🔹 Normalize form values early
                string referenceNumber = form["ReferenceNumber"].ToString();
                if (string.IsNullOrEmpty(referenceNumber))
                    return BadRequest(new { status = false, message = "ReferenceNumber is required." });

                if (!int.TryParse(form["ServiceId"], out int serviceId) || serviceId <= 0)
                    return BadRequest(new { status = false, message = "ServiceId is required and must be a valid integer." });

                if (!bool.TryParse(form["IsWithheld"], out bool isWithheld))
                    return BadRequest(new { status = false, message = "Invalid or missing IsWithheld value." });

                string withheldType = form["WithheldType"].ToString();
                if (string.IsNullOrEmpty(withheldType))
                    return BadRequest(new { status = false, message = "WithheldType is required." });

                string withheldReason = form["WithheldReason"].ToString();
                if (string.IsNullOrEmpty(withheldReason))
                    return BadRequest(new { status = false, message = "WithheldReason is required." });

                string action = form["Action"].ToString(); // ✅ force string
                if (string.IsNullOrEmpty(action))
                    return BadRequest(new { status = false, message = "Action is required." });

                // 🔹 Check if application already exists
                var existingApplication = dbcontext.WithheldApplications
                    .FirstOrDefault(wa => wa.ReferenceNumber == referenceNumber && wa.ServiceId == serviceId);

                if (existingApplication != null)
                    return BadRequest(new { status = false, message = "Application already exists." });

                // 🔹 Handle file uploads
                var fileNames = new List<string>();
                var files = form.Files.GetFiles("Files");
                foreach (var file in files)
                {
                    if (file.Length > 0)
                    {
                        var fileName = await helper.GetFilePath(file);
                        if (!string.IsNullOrEmpty(fileName) && fileName != "No file provided.")
                        {
                            fileNames.Add(fileName);
                        }
                    }
                }

                var CitizenApplications = dbcontext.CitizenApplications
                    .FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);

                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);

                if (CitizenApplications == null || service == null)
                    return BadRequest(new { status = false, message = "Invalid application or service." });

                JObject formDetailsJObject;
                try
                {
                    formDetailsJObject = JObject.Parse(CitizenApplications.FormDetails!);
                }
                catch (JsonException ex)
                {
                    return BadRequest($"Failed to deserialize form details for application '{referenceNumber}': {ex.Message}");
                }

                if (!formDetailsJObject.TryGetValue("Location", out JToken? locationToken) || locationToken.Type == JTokenType.Null)
                    return BadRequest($"'Location' property is missing or null in form details for application '{referenceNumber}'.");

                string location = locationToken.ToString();

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

                int currentPlayerIndex = players.ToList().FindIndex(p => p["designation"]?.ToString() == officer.Role);
                if (currentPlayerIndex < 0)
                    return BadRequest(new { status = false, message = "Officer not part of the workflow." });

                // 🔹 Build filtered workflow
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

                // 🔹 Update workflow based on action
                if (action == "forward")
                {
                    filteredWorkflow[currentPlayerIndex]["status"] = "forwarded";

                    if (currentPlayerIndex + 1 < filteredWorkflow.Count)
                    {
                        filteredWorkflow[currentPlayerIndex + 1]["status"] = "pending";
                    }
                }
                else if (action == "approve")
                {
                    filteredWorkflow[currentPlayerIndex]["status"] = "approved";
                    filteredWorkflow[currentPlayerIndex]["completedAt"] = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");
                    filteredWorkflow[currentPlayerIndex]["remarks"] = withheldReason;
                }
                else
                {
                    return BadRequest(new { status = false, message = "Invalid Action value. Allowed: forward, approve." });
                }

                var workFlow = JsonConvert.SerializeObject(filteredWorkflow);

                // 🔹 Build history
                var history = new
                {
                    officer = officer.Role + " " + GetOfficerArea(officer.AccessLevel!, formDetailsJObject),
                    status = action,  // ✅ plain string
                    remarks = withheldReason,
                    actionTakenOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
                };

                List<dynamic> History = new List<dynamic> { history };

                if (action == "forward")
                {
                    string designation = (string)filteredWorkflow[currentPlayerIndex + 1]["designation"]!;
                    string accessLevel = dbcontext.OfficersDesignations.FirstOrDefault(d => d.Designation == designation)!.AccessLevel!;
                    History.Add(new
                    {
                        officer = designation + " " + GetOfficerArea(accessLevel, formDetailsJObject),
                        status = "pending",
                        remarks = "",
                        actionTakenOn = ""
                    });
                }

                // 🔹 Create new withheld application
                var newApplication = new WithheldApplications
                {
                    ServiceId = serviceId,
                    ReferenceNumber = referenceNumber,
                    Location = location,
                    WorkFlow = workFlow,
                    CurrentPlayer = action == "forward" ? currentPlayerIndex + 1 : currentPlayerIndex,
                    History = JsonConvert.SerializeObject(History),
                    IsWithheld = isWithheld,
                    WithheldType = withheldType,
                    WithheldReason = withheldReason,
                    Status = action != "approve" ? "Initiated" : "Approved",
                    Files = fileNames.Count != 0 ? JsonConvert.SerializeObject(fileNames) : null,
                };

                dbcontext.WithheldApplications.Add(newApplication);
                await dbcontext.SaveChangesAsync();

                return Ok(new { status = true, message = "Application created successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = "Failed to create application: " + ex.Message });
            }
        }


        [HttpPut]
        public async Task<IActionResult> UpdateWithheldApplication([FromForm] IFormCollection form)
        {
            try
            {
                var officer = GetOfficerDetails();

                // 🔹 Validate input
                if (!form.TryGetValue("ReferenceNumber", out StringValues referenceNumber) || string.IsNullOrEmpty(referenceNumber.ToString()))
                    return BadRequest(new { status = false, message = "ReferenceNumber is required." });

                if (!form.TryGetValue("ServiceId", out StringValues serviceIdStr) || !int.TryParse(serviceIdStr.ToString(), out int serviceId) || serviceId <= 0)
                    return BadRequest(new { status = false, message = "ServiceId is required and must be a valid integer." });

                if (!form.TryGetValue("IsWithheld", out StringValues isWithheldStr) || !bool.TryParse(isWithheldStr.ToString(), out bool isWithheld))
                    return BadRequest(new { status = false, message = "Invalid or missing IsWithheld value." });

                if (!form.TryGetValue("WithheldType", out StringValues withheldType) || string.IsNullOrEmpty(withheldType.ToString()))
                    return BadRequest(new { status = false, message = "WithheldType is required." });

                if (!form.TryGetValue("WithheldReason", out StringValues withheldReason) || string.IsNullOrEmpty(withheldReason.ToString()))
                    return BadRequest(new { status = false, message = "WithheldReason is required." });

                if (!form.TryGetValue("Action", out StringValues action) || string.IsNullOrEmpty(action.ToString()))
                    return BadRequest(new { status = false, message = "Action is required." });

                // 🔹 Find existing application
                var application = dbcontext.WithheldApplications
                    .FirstOrDefault(wa => wa.ReferenceNumber == referenceNumber.ToString() && wa.ServiceId == serviceId);

                if (application == null)
                    return NotFound(new { status = false, message = "Application not found." });

                // 🔹 Validate citizen application and service
                var CitizenApplications = dbcontext.CitizenApplications
                    .FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber.ToString());

                var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceId);

                if (CitizenApplications == null || service == null)
                    return BadRequest(new { status = false, message = "Invalid application or service." });

                // 🔹 Parse form details
                JObject formDetailsJObject;
                try
                {
                    formDetailsJObject = JObject.Parse(CitizenApplications.FormDetails!);
                }
                catch (JsonException ex)
                {
                    return BadRequest(new { status = false, message = $"Failed to deserialize form details for application '{referenceNumber}': {ex.Message}" });
                }

                if (!formDetailsJObject.TryGetValue("Location", out JToken? locationToken) || locationToken.Type == JTokenType.Null)
                    return BadRequest(new { status = false, message = $"'Location' property is missing or null in form details for application '{referenceNumber}'." });

                string location = locationToken.ToString();

                // 🔹 Parse workflow
                JArray players;
                try
                {
                    players = JArray.Parse(service.OfficerEditableField ?? "[]");
                }
                catch (JsonException ex)
                {
                    return BadRequest(new { status = false, message = $"Failed to parse OfficerEditableField: {ex.Message}" });
                }

                if (players.Count == 0)
                    return BadRequest(new { status = false, message = "No workflow players defined for this service." });

                int currentPlayerIndex = players.ToList().FindIndex(p => p["designation"]?.ToString() == officer.Role);
                if (currentPlayerIndex < 0)
                    return BadRequest(new { status = false, message = "Officer not part of the workflow." });

                // 🔹 Build or update workflow
                JArray filteredWorkflow;
                try
                {
                    filteredWorkflow = string.IsNullOrEmpty(application.WorkFlow)
                        ? new JArray()
                        : JArray.Parse(application.WorkFlow);
                }
                catch (JsonException ex)
                {
                    return BadRequest(new { status = false, message = $"Failed to parse existing workflow: {ex.Message}" });
                }

                if (filteredWorkflow.Count == 0)
                {
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
                }

                // 🔹 Update workflow based on action
                if (action == "forward")
                {
                    filteredWorkflow[currentPlayerIndex]["status"] = "forwarded";
                    if (currentPlayerIndex + 1 < filteredWorkflow.Count)
                    {
                        filteredWorkflow[currentPlayerIndex + 1]["status"] = "pending";
                    }
                }
                else if (action == "approve")
                {
                    filteredWorkflow[currentPlayerIndex]["status"] = "approved";
                    filteredWorkflow[currentPlayerIndex]["completedAt"] = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");
                    filteredWorkflow[currentPlayerIndex]["remarks"] = withheldReason.ToString();
                }
                else
                {
                    return BadRequest(new { status = false, message = "Invalid Action value. Allowed: forward, approve." });
                }

                var workFlow = JsonConvert.SerializeObject(filteredWorkflow);

                // 🔹 Handle file uploads
                var fileNames = new List<string>();
                if (!string.IsNullOrEmpty(application.Files))
                {
                    fileNames = JsonConvert.DeserializeObject<List<string>>(application.Files) ?? new List<string>();
                }

                var files = form.Files.GetFiles("Files");
                foreach (var file in files)
                {
                    if (file.Length > 0)
                    {
                        var fileName = await helper.GetFilePath(file);
                        if (!string.IsNullOrEmpty(fileName) && fileName != "No file provided.")
                        {
                            fileNames.Add(fileName);
                        }
                    }
                }

                // 🔹 Build or update history
                List<dynamic> historyList;
                try
                {
                    historyList = string.IsNullOrEmpty(application.History)
                        ? new List<dynamic>()
                        : JsonConvert.DeserializeObject<List<dynamic>>(application.History) ?? new List<dynamic>();
                }
                catch (JsonException ex)
                {
                    return BadRequest(new { status = false, message = $"Failed to parse existing history: {ex.Message}" });
                }

                var history = new
                {
                    officer = officer.Role + " " + GetOfficerArea(officer.AccessLevel!, formDetailsJObject),
                    status = action.ToString(),
                    remarks = withheldReason.ToString(),
                    actionTakenOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
                };
                historyList.Add(history);

                if (action == "forward" && currentPlayerIndex + 1 < filteredWorkflow.Count)
                {
                    string designation = (string)filteredWorkflow[currentPlayerIndex + 1]["designation"]!;
                    string accessLevel = dbcontext.OfficersDesignations.FirstOrDefault(d => d.Designation == designation)!.AccessLevel!;
                    historyList.Add(new
                    {
                        officer = designation + " " + GetOfficerArea(accessLevel, formDetailsJObject),
                        status = "pending",
                        remarks = "",
                        actionTakenOn = ""
                    });
                }

                // 🔹 Update application
                application.ServiceId = serviceId;
                application.ReferenceNumber = referenceNumber.ToString();
                application.Location = location;
                application.WorkFlow = workFlow;
                application.CurrentPlayer = action == "forward" ? currentPlayerIndex + 1 : currentPlayerIndex;
                application.History = JsonConvert.SerializeObject(historyList);
                application.IsWithheld = isWithheld;
                application.WithheldType = withheldType.ToString();
                application.WithheldReason = withheldReason.ToString();
                application.Status = action != "approve" ? "Initiated" : "Approved";
                application.Files = fileNames.Count != 0 ? JsonConvert.SerializeObject(fileNames) : null;

                await dbcontext.SaveChangesAsync();


                return Ok(new { status = true, message = "Application updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = "Failed to update application: " + ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateAadhaarToken([FromForm] IFormCollection form)
        {
            if (form == null)
                return BadRequest(new { success = false, message = "Form data is required." });

            var referenceNumber = form["referenceNumber"].ToString().Trim();
            var aadhaarToken = form["aadhaarToken"].ToString().Trim();

            if (string.IsNullOrWhiteSpace(referenceNumber))
                return BadRequest(new { success = false, message = "ReferenceNumber is required." });

            if (string.IsNullOrWhiteSpace(aadhaarToken))
                return BadRequest(new { success = false, message = "AadhaarToken is required." });

            try
            {
                var pReference = new Microsoft.Data.SqlClient.SqlParameter("@ReferenceNumber", System.Data.SqlDbType.NVarChar, 100)
                {
                    Value = referenceNumber
                };

                var pToken = new Microsoft.Data.SqlClient.SqlParameter("@AadhaarToken", System.Data.SqlDbType.NVarChar, 4000)
                {
                    Value = aadhaarToken
                };

                // Execute SP — we don't rely on rowsAffected
                await dbcontext.Database.ExecuteSqlRawAsync(
                    "EXEC dbo.UpdateAadhaarTokenByReference @ReferenceNumber, @AadhaarToken",
                    pReference, pToken);

                // Return success if no exception
                return Ok(new { success = true, message = "Aadhaar token updated successfully." });
            }
            catch (Microsoft.Data.SqlClient.SqlException sqlEx)
            {
                _logger.LogError(sqlEx, "SQL error updating Aadhaar token for {Ref}", referenceNumber);
                return StatusCode(500, new { success = false, message = "Database error." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating Aadhaar token for {Ref}", referenceNumber);
                return StatusCode(500, new { success = false, message = "Server error." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> PrepareEsign([FromForm] IFormFile pdfBlob, [FromForm] string userName, [FromForm] string signPosition, [FromForm] int pageNo, [FromForm] string applicationId)
        {
            var tempDir = Path.Combine(_webHostEnvironment.WebRootPath, "Temp");
            Directory.CreateDirectory(tempDir);

            var preparedPdfPath = Path.Combine(tempDir, $"prepared_pdf_{applicationId}_{Guid.NewGuid():N}.pdf");
            try
            {
                _logger.LogInformation("Starting eSign for applicationId: {ApplicationId}, user: {UserName}", applicationId, userName);

                // Input validation
                if (pdfBlob == null || pdfBlob.Length == 0)
                    return BadRequest(new { status = false, message = "No PDF uploaded." });
                if (pageNo < 1)
                    return BadRequest(new { status = false, message = "Invalid page number." });
                if (string.IsNullOrEmpty(userName))
                    return BadRequest(new { status = false, message = "Username is required." });
                if (!new[] { "1", "2" }.Contains(signPosition))
                    return BadRequest(new { status = false, message = "Invalid sign position." });

                // Read PDF into memory
                await using var inputStream = pdfBlob.OpenReadStream();
                var memoryStream = new MemoryStream();
                await inputStream.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                var clientCertPath = Path.Combine(_webHostEnvironment.WebRootPath, _config["Certificate:CertPath"] ?? throw new InvalidOperationException("Certificate:CertPath not configured"));
                var clientCertPassword = _config["Certificate:CertPassword"] ?? throw new InvalidOperationException("Certificate:CertPassword not configured");

                // Dynamic callback
                var callbackUrl = $"{Request.Scheme}://{Request.Host}/Officer/EsignResponse";
                var gatewayResponseUrl = $"https://esigngw.jk.gov.in/eSign21/response?rs={Uri.EscapeDataString(callbackUrl)}";

                // Generate transaction ID (ensure unique and not overly truncated)
                var txnId = $"999-EDJK-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid():N}".Substring(0, 30); // Max 30 chars for safety
                _logger.LogInformation("Generated txnId: {TxnId}", txnId);

                // Generate compact XML
                var sb = new StringBuilder();
                byte[] preparedPdf = null!;
                var xmlSettings = new XmlWriterSettings
                {
                    Indent = false,
                    NewLineHandling = NewLineHandling.None,
                    OmitXmlDeclaration = false
                };

                using (var writer = XmlWriter.Create(sb, xmlSettings))
                {
                    writer.WriteProcessingInstruction("xml", @"version=""1.0"" encoding=""UTF-8""");
                    writer.WriteStartElement("Esign");
                    writer.WriteAttributeString("AuthMode", "1");
                    writer.WriteAttributeString("ver", "2.1");
                    writer.WriteAttributeString("sc", "Y");
                    writer.WriteAttributeString("ts", DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture));
                    writer.WriteAttributeString("txn", txnId);
                    writer.WriteAttributeString("ekycId", "");
                    writer.WriteAttributeString("aspId", "JKIT-900");
                    writer.WriteAttributeString("ekycIdType", "A");
                    writer.WriteAttributeString("responseSigType", "pkcs7");
                    writer.WriteAttributeString("responseUrl", gatewayResponseUrl);

                    writer.WriteStartElement("Docs");
                    writer.WriteStartElement("InputHash");
                    writer.WriteAttributeString("id", "1");
                    writer.WriteAttributeString("hashAlgorithm", "SHA256");
                    writer.WriteAttributeString("docInfo", "Sanction Letter");

                    var (documentHash, pdfBytes) = await GetDocumentHashAsync(memoryStream, userName, signPosition, pageNo);
                    preparedPdf = pdfBytes;
                    writer.WriteString(documentHash);

                    writer.WriteEndElement(); // InputHash
                    writer.WriteEndElement(); // Docs
                    writer.WriteEndElement(); // Esign
                    writer.Flush();
                }

                var strxml = sb.ToString().Trim();
                if (string.IsNullOrEmpty(strxml))
                    throw new InvalidOperationException("Generated XML is empty");

                _logger.LogDebug("Generated XML preview: {Xml}", strxml.Substring(0, Math.Min(strxml.Length, 500)));

                // Load and validate client certificate
                if (!System.IO.File.Exists(clientCertPath))
                    throw new FileNotFoundException("Client certificate not found", clientCertPath);

                var clientCert = new X509Certificate2(clientCertPath, clientCertPassword);
                if (clientCert.NotAfter < DateTime.Now)
                    throw new InvalidOperationException("Client certificate has expired");

                _logger.LogInformation("Certificate loaded: Subject={Subject}, Thumbprint={Thumbprint}, ValidFrom={ValidFrom}, ValidTo={ValidTo}",
                    clientCert.Subject, clientCert.Thumbprint, clientCert.NotBefore, clientCert.NotAfter);

                // Sign XML
                var signedXml = SignXml(strxml);
                _logger.LogDebug("Signed XML preview: {SignedXml}", signedXml.Substring(0, Math.Min(signedXml.Length, 500)));

                var xmlFilePath = Path.Combine(_webHostEnvironment.WebRootPath, "Uploads", $"xml_{applicationId}_{txnId}.xml");
                _logger.LogInformation("Saving XML to path: {Path}", xmlFilePath);
                await System.IO.File.WriteAllTextAsync(xmlFilePath, signedXml);

                // Save PDF to temp file and verify
                await System.IO.File.WriteAllBytesAsync(preparedPdfPath, preparedPdf);
                if (!System.IO.File.Exists(preparedPdfPath))
                    throw new IOException($"Failed to save temporary PDF at {preparedPdfPath}");

                _logger.LogInformation("Saved temporary PDF at {Path}", preparedPdfPath);

                // Store in cache
                var cacheEntry = new
                {
                    PreparedPdfPath = preparedPdfPath,
                    ApplicationId = applicationId,
                    TxnId = txnId
                };
                var cacheKey = $"esign_{txnId}";
                _memoryCache.Set(cacheKey, cacheEntry, TimeSpan.FromHours(1)); // Extend to 1 hour
                _logger.LogInformation("Cached eSign data with key: {CacheKey}", cacheKey);

                // Return form data for frontend
                return Ok(new
                {
                    status = true,
                    signedXml = System.IO.File.ReadAllText(xmlFilePath),
                    clientrequestURL = callbackUrl,
                    username = userName,
                    userId = "2",
                    txnId = txnId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in PrepareEsign: {Message}", ex.Message);
                if (System.IO.File.Exists(preparedPdfPath))
                {
                    try { System.IO.File.Delete(preparedPdfPath); } catch { }
                }
                return StatusCode(500, new { status = false, message = ex.Message });
            }
        }

        [HttpGet]
        [HttpGet]
        public IActionResult CheckESignStatus([FromQuery] string applicationId)
        {
            try
            {
                var signedPdfPath = Path.Combine(_webHostEnvironment.WebRootPath, "Temp", $"signed_pdf_{applicationId}.pdf");
                var isSigned = System.IO.File.Exists(signedPdfPath);
                _logger.LogInformation("Checking eSign status for applicationId: {ApplicationId}, Signed PDF exists: {IsSigned}", applicationId, isSigned);
                var fileName = applicationId.Replace("/", "_") + "_SanctionLetter.pdf";
                return Ok(new { success = isSigned, path = isSigned ? fileName : null });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CheckESignStatus: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }   // Updated EsignResponse in OfficerController.cs

        [HttpPost]
        [AllowAnonymous]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> EsignResponse(IFormCollection form)
        {
            string? preparedPath = null;
            try
            {
                _logger.LogInformation("Processing EsignResponse action");
                _logger.LogInformation("Response headers: {Headers}", string.Join(", ", Request.Headers.Select(h => $"{h.Key}: {h.Value}")));
                _logger.LogInformation("Response form data: {FormData}", string.Join(", ", form.Select(f => $"{f.Key}: {f.Value.ToString().Substring(0, Math.Min(f.Value.ToString().Length, 100))}")));

                var resp = form["respon"];
                if (string.IsNullOrEmpty(resp))
                {
                    _logger.LogWarning("No response XML received");
                    return Json(new { success = false, message = "No response received from eSign service." });
                }

                // Extract transaction ID from response XML
                var xmlDoc = new XmlDocument();
                xmlDoc.LoadXml(resp!);
                var txnId = xmlDoc.SelectSingleNode("/EsignResp/@txn")?.Value;
                if (string.IsNullOrEmpty(txnId))
                {
                    _logger.LogWarning("No transaction ID in response XML");
                    return Json(new { success = false, message = "Invalid response: No transaction ID." });
                }
                _logger.LogInformation("Received txnId: {TxnId}", txnId);

                // Retrieve from cache
                var cacheKey = $"esign_{txnId}";
                if (!_memoryCache.TryGetValue(cacheKey, out dynamic cacheEntry))
                {
                    _logger.LogWarning("No cache entry found for key: {CacheKey}", cacheKey);
                    return Json(new { success = false, message = "Invalid session data or temporary PDF not found. Cache key missing." });
                }

                preparedPath = cacheEntry!.PreparedPdfPath as string;
                var applicationId = cacheEntry.ApplicationId as string;
                var cachedTxnId = cacheEntry.TxnId as string;

                if (string.IsNullOrEmpty(applicationId) || string.IsNullOrEmpty(preparedPath))
                {
                    _logger.LogWarning("Invalid cache data: ApplicationId={ApplicationId}, PreparedPdfPath={PreparedPdfPath}", applicationId, preparedPath);
                    return Json(new { success = false, message = "Invalid cache data." });
                }

                if (cachedTxnId != txnId)
                {
                    _logger.LogWarning("Transaction ID mismatch: Cached={CachedTxnId}, Received={ReceivedTxnId}", cachedTxnId, txnId);
                    return Json(new { success = false, message = "Transaction ID mismatch." });
                }

                if (!System.IO.File.Exists(preparedPath))
                {
                    _logger.LogWarning("Temporary PDF not found at {PreparedPath}", preparedPath);
                    return Json(new { success = false, message = "Temporary PDF not found." });
                }

                if (!CheckESignUserName(resp!))
                {
                    _logger.LogWarning("Invalid user certificate");
                    return Json(new { success = false, message = "Invalid user certificate." });
                }

                var signedPdfPath = Path.Combine(_webHostEnvironment.WebRootPath, "Temp", $"signed_pdf_{applicationId}.pdf");

                // Read PDF into MemoryStream
                byte[] pdfBytes;
                using (var fileStream = new FileStream(preparedPath, FileMode.Open, FileAccess.Read))
                {
                    pdfBytes = new byte[fileStream.Length];
                    await fileStream.ReadAsync(pdfBytes, 0, pdfBytes.Length);
                }

                // Process signing in memory with an expandable MemoryStream
                using (var memoryStream = new MemoryStream())
                {
                    await memoryStream.WriteAsync(pdfBytes, 0, pdfBytes.Length);
                    memoryStream.Position = 0;

                    _logger.LogDebug("Embedding signature into PDF for applicationId: {ApplicationId}", applicationId);
                    EmbedSignature(resp!, memoryStream); // Embed signature
                    await memoryStream.FlushAsync();

                    // Save signed PDF
                    await System.IO.File.WriteAllBytesAsync(signedPdfPath, memoryStream.ToArray());
                }

                // Delete original prepared PDF
                try
                {
                    System.IO.File.Delete(preparedPath);
                    _logger.LogInformation("Deleted temporary PDF at {PreparedPath}", preparedPath);
                }
                catch (IOException ex)
                {
                    _logger.LogWarning("Failed to delete temporary PDF at {PreparedPath}: {Message}", preparedPath, ex.Message);
                }

                var node = xmlDoc.SelectSingleNode("/EsignResp");
                var esign_status = node?.Attributes?["status"]?.Value ?? "";
                var interrorCode = node?.Attributes?["errCode"]?.Value ?? "";
                var strmsg = node?.Attributes?["errMsg"]?.Value ?? "";
                if (esign_status != "1")
                {
                    _logger.LogWarning("eSign failed: {ErrorMsg} ({ErrorCode})", strmsg, interrorCode);
                    return Json(new { success = false, message = $"eSign failed: {strmsg} ({interrorCode})" });
                }

                // Clean up XML files
                var xmlFilePathPattern = Path.Combine(_webHostEnvironment.WebRootPath, "Uploads", $"xml_{applicationId}_*.xml");
                foreach (var file in System.IO.Directory.GetFiles(Path.GetDirectoryName(xmlFilePathPattern) ?? "", Path.GetFileName(xmlFilePathPattern)))
                {
                    _logger.LogInformation("Cleaning up XML file at {Path}", file);
                    try
                    {
                        System.IO.File.Delete(file);
                    }
                    catch (IOException ex)
                    {
                        _logger.LogWarning("Failed to delete XML file at {Path}: {Message}", file, ex.Message);
                    }
                }

                byte[] signedBytes;
                using (var fs = new FileStream(signedPdfPath, FileMode.Open, FileAccess.Read))
                {
                    signedBytes = new byte[fs.Length];
                    await fs.ReadAsync(signedBytes, 0, signedBytes.Length);
                }

                var fileName = applicationId.Replace("/", "_") + "_SanctionLetter.pdf";
                var existingFile = await dbcontext.UserDocuments.FirstOrDefaultAsync(f => f.FileName == fileName);
                if (existingFile != null)
                {
                    existingFile.FileData = signedBytes;
                    existingFile.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    dbcontext.UserDocuments.Add(new UserDocuments
                    {
                        FileName = fileName,
                        FileData = signedBytes,
                        FileType = "application/pdf",
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                await dbcontext.SaveChangesAsync();

                // Remove cache entry
                _memoryCache.Remove(cacheKey);
                _logger.LogInformation("Removed cache entry for key: {CacheKey}", cacheKey);

                _logger.LogInformation("eSign completed successfully for applicationId: {ApplicationId}", applicationId);
                return Json(new { success = true, message = "PDF signed successfully.", path = fileName });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in EsignResponse: {Message}", ex.Message);
                if (!string.IsNullOrEmpty(preparedPath) && System.IO.File.Exists(preparedPath))
                {
                    try { System.IO.File.Delete(preparedPath); } catch { }
                }
                return Json(new { success = false, message = $"Error processing response: {ex.Message}" });
            }
        }



    }
}