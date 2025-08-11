using Microsoft.AspNetCore.Mvc;
using Microsoft.CodeAnalysis.Differencing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;
using System.Collections.Specialized;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;

namespace SahayataNidhi.Controllers.User
{
    public partial class UserController
    {
        [HttpPost]
        public IActionResult SetServiceForm([FromForm] IFormCollection form)
        {
            int serviceId = Convert.ToInt32(form["serviceId"].ToString());

            return Json(new { status = true, url = "/user/form" });
        }

        public static string FormatKey(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            // Use Regex to insert space before each capital letter, except for the first one
            string result = Regex.Replace(input, "(?<!^)([A-Z])", " $1");

            return result;
        }
        [HttpGet]
        public IActionResult GetDistricts()
        {
            var districts = dbcontext.Districts.ToList();
            return Json(new { status = true, districts });
        }
        [HttpGet]
        public IActionResult GetDistrictsForService()
        {
            // Fetch only required fields from Users table
            var officerDetailsJsons = dbcontext.Users
                .Where(u => u.UserType == "Officer" && u.AdditionalDetails != null)
                .Select(u => u.AdditionalDetails)
                .ToList(); // Materialize data first

            // Now parse JSON and filter in-memory
            var districtIds = officerDetailsJsons
                .Select(json => JsonConvert.DeserializeObject<Dictionary<string, object>>(json!))
                .Where(details =>
                    details!.ContainsKey("AccessLevel") &&
                    details["AccessLevel"]?.ToString() == "District" &&
                    details.ContainsKey("AccessCode"))
                .Select(details => Convert.ToInt32(details!["AccessCode"]))
                .Distinct()
                .ToList();

            // Fetch matched districts
            var districts = dbcontext.Districts
                .Where(d => districtIds.Contains(d.DistrictId))
                .ToList();

            return Json(new { status = true, districts });
        }
        [HttpGet]
        public IActionResult GetTehsils(string districtId)
        {
            int.TryParse(districtId, out int DistrictId);
            var tehsils = dbcontext.Tehsils.Where(u => u.DistrictId == DistrictId).ToList();
            return Json(new { status = true, tehsils });
        }
        [HttpGet]
        public string GetDistrictName(int districtId)
        {
            string? districtName = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == districtId)!.DistrictName;
            return districtName!;
        }
        [HttpGet]
        public string GetTehsilName(int tehsilId)
        {
            string? tehsilName = dbcontext.Tehsils.FirstOrDefault(d => d.TehsilId == tehsilId)!.TehsilName;
            return tehsilName!;
        }

        public int GetCountPerDistrict(int districtId, int serviceId, string? type = "Application")
        {
            var financialYear = helper.GetCurrentFinancialYear();

            // Define the output parameter
            var newCountParam = new SqlParameter
            {
                ParameterName = "@NewCount",
                SqlDbType = System.Data.SqlDbType.Int,
                Direction = System.Data.ParameterDirection.Output
            };

            // Call the stored procedure
            dbcontext.Database.ExecuteSqlRaw(
                "EXEC GetAndIncrementCount @DistrictId = {0}, @ServiceId = {1}, @FinancialYear = {2}, @Type = {3}, @NewCount = @NewCount OUTPUT",
                districtId, serviceId, financialYear, type, newCountParam
            );

            // Retrieve the output value
            return (int)newCountParam.Value;
        }

        public string GetOfficerArea(string designation, dynamic formDetails)
        {
            var officerDesignation = dbcontext.OfficersDesignations
                .FirstOrDefault(od => od.Designation == designation);

            if (officerDesignation == null)
                return string.Empty;

            string accessLevel = officerDesignation.AccessLevel ?? string.Empty;
            int accessCode;

            switch (accessLevel)
            {
                case "Tehsil":
                    accessCode = Convert.ToInt32(GetFieldValue("Tehsil", formDetails));
                    var tehsil = dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == accessCode);
                    return tehsil?.TehsilName ?? string.Empty;

                case "District":
                    accessCode = Convert.ToInt32(GetFieldValue("District", formDetails));
                    var district = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == accessCode);
                    return district?.DistrictName ?? string.Empty;

                case "Division":
                    accessCode = Convert.ToInt32(GetFieldValue("District", formDetails));
                    var districtForDivision = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == accessCode);
                    if (districtForDivision == null)
                        return string.Empty;
                    return districtForDivision.Division == 1 ? "Jammu" : "Kashmir";
                case "State":
                    return "J&K";
                default:
                    return string.Empty;
            }
        }

        public string GetOfficerAreaForHistory(string accessLevel, int? accessCode)
        {


            switch (accessLevel)
            {
                case "Tehsil":
                    var tehsil = dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == accessCode);
                    return tehsil?.TehsilName ?? string.Empty;

                case "District":
                    var district = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == accessCode);
                    return district?.DistrictName ?? string.Empty;

                case "Division":
                    var districtForDivision = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == accessCode);
                    if (districtForDivision == null)
                        return string.Empty;
                    return districtForDivision.Division == 1 ? "Jammu" : "Kashmir";
                case "State":
                    return "J&K";
                default:
                    return string.Empty;
            }
        }

        private static string SaveFile(IFormFile file)
        {
            // Define the folder to store files (e.g., wwwroot/uploads)
            string folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            // Generate a unique filename using a GUID and preserve the file extension
            string uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            string filePath = Path.Combine(folderPath, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                file.CopyTo(stream);
            }

            // Return the relative path (or absolute, as needed) for storage in your JSON.
            return "/uploads/" + uniqueFileName;
        }
        [HttpGet]
        public IActionResult GetServiceContent(int serviceId)
        {
            // Retrieve the serviceId from the JWT claims or other mechanisms if necessary.
            var service = dbcontext.Services.FirstOrDefault(ser => ser.ServiceId == serviceId);

            if (service != null)
            {
                return Json(new { status = true, service.ServiceName, service.FormElement, service.ServiceId });
            }
            else
            {
                return Json(new { status = false, message = "No Service Found" });
            }
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
        private dynamic GetFormattedValue(dynamic item, JObject data)
        {
            if (item == null)
                return new { Label = "[No Label]", Value = "[Item is null]" };

            string label = item.label?.ToString() ?? "[No Label]";
            string fmt = item.transformString?.ToString() ?? "{0}";

            if (!Regex.IsMatch(fmt, @"\{\d+\}"))
                return new { Label = label, Value = fmt };

            // Build rawValues, ensuring empty or missing fields are represented as empty strings
            var rawValues = (item.selectedFields as IEnumerable<object> ?? Enumerable.Empty<object>())
                .Select(sf =>
                {
                    var name = sf?.ToString() ?? "";
                    if (string.IsNullOrWhiteSpace(name)) return "";

                    var fieldObj = FindFieldRecursively(data, name);
                    string value = "";

                    if (fieldObj != null)
                    {
                        value = ExtractValueWithSpecials(fieldObj, name);

                        // Check if the field name suggests a date and try to format it
                        if (name.IndexOf("Date", StringComparison.OrdinalIgnoreCase) >= 0 &&
                            DateTime.TryParse(value, out DateTime dt))
                        {
                            value = dt.ToString("dd MMM yyyy");
                        }
                    }

                    return string.IsNullOrWhiteSpace(value) ? "" : value;
                })
                .ToList();

            // Tokenize fmt into literals and placeholders
            var tokens = Regex.Split(fmt, @"(\{\d+\})").Where(t => !string.IsNullOrEmpty(t)).ToList();

            var outputParts = new List<string>();
            string literalAccumulator = "";

            for (int i = 0; i < tokens.Count; i++)
            {
                var token = tokens[i];

                if (Regex.IsMatch(token, @"^\{\d+\}$"))
                {
                    // It's a placeholder
                    var indexStr = token.Substring(1, token.Length - 2);
                    if (int.TryParse(indexStr, out int index) && index < rawValues.Count && !string.IsNullOrWhiteSpace(rawValues[index]))
                    {
                        // Append accumulated literal and the placeholder's value
                        outputParts.Add(literalAccumulator);
                        outputParts.Add(rawValues[index]);
                    }
                    // Reset accumulator regardless of whether the placeholder was valid
                    literalAccumulator = "";
                }
                else
                {
                    // Accumulate literal, but don't append yet
                    literalAccumulator += token;
                }
            }

            // Join the output parts
            var result = string.Join("", outputParts);

            // Clean up multiple commas and trailing commas/spaces
            result = Regex.Replace(result, @",(\s*,)*\s*$", "");
            result = Regex.Replace(result, @"\s*,\s*,", ",").Trim();

            _logger.LogInformation($"---------- Result: {JsonConvert.SerializeObject(result)} --------------------");

            return new { Label = label, Value = result };
        }


        // Recursive search for a JObject with ["name"] == fieldName
        private static JObject? FindFieldRecursively(JToken token, string fieldName)
        {
            if (token is JObject obj)
            {
                if (obj["name"]?.ToString() == fieldName) return obj;
                foreach (var prop in obj.Properties())
                    if (FindFieldRecursively(prop.Value, fieldName) is JObject found)
                        return found;
            }
            else if (token is JArray arr)
            {
                foreach (var el in arr)
                    if (FindFieldRecursively(el, fieldName) is JObject found)
                        return found;
            }
            return null;
        }
        // Extracts the string value (or does District/Tehsil lookups)
        private string ExtractValueWithSpecials(JObject fieldObj, string fieldName)
        {
            var tok = fieldObj["value"] ?? fieldObj["File"] ?? fieldObj["Enclosure"];
            if (tok == null) return "";

            var s = tok.ToString();
            if (fieldName.Contains("District", StringComparison.OrdinalIgnoreCase)
             && int.TryParse(s, out int did))
                return GetDistrictName(did);

            if (fieldName.Contains("Tehsil", StringComparison.OrdinalIgnoreCase)
                    && int.TryParse(s, out int tid))
            {
                try
                {
                    return GetTehsilName(tid);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Tehsil lookup failed for ID: {tid}. Exception: {ex.Message}");
                    return $"Unknown Tehsil ({tid})";
                }
            }
            if (fieldName.Contains("Muncipality", StringComparison.OrdinalIgnoreCase)
             && int.TryParse(s, out int muncipalityId))
                return dbcontext.Muncipalities.FirstOrDefault(m => m.MuncipalityId == muncipalityId)!.MuncipalityName!;
            if (fieldName.Contains("Ward", StringComparison.OrdinalIgnoreCase)
            && int.TryParse(s, out int WardId))
                return dbcontext.Wards.FirstOrDefault(m => m.WardCode == WardId)!.WardNo.ToString()!;
            if (fieldName.Contains("Block", StringComparison.OrdinalIgnoreCase)
           && int.TryParse(s, out int BlockId))
                return dbcontext.Blocks.FirstOrDefault(m => m.BlockId == BlockId)!.BlockName!;
            if (fieldName.Contains("HalqaPanchayat", StringComparison.OrdinalIgnoreCase)
                 && int.TryParse(s, out int HalqaPanchayatId))
                return dbcontext.HalqaPanchayats.FirstOrDefault(m => m.HalqaPanchayatId == HalqaPanchayatId)!.HalqaPanchayatName!;
            if (fieldName.Contains("Village", StringComparison.OrdinalIgnoreCase)
                 && int.TryParse(s, out int VillageId))
                return dbcontext.Villages.FirstOrDefault(m => m.VillageId == VillageId)!.VillageName!;

            return s;
        }
        public string GetStringValue(string fieldName, dynamic data)
        {
            foreach (var section in data)
            {
                if (section.First is JArray fields)
                {
                    foreach (var field in fields)
                    {
                        if (field["name"] != null && field["name"]?.ToString() == fieldName)
                        {
                            int value = Convert.ToInt32(field["value"]);

                            if (fieldName == "Tehsil")
                                return dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == value)?.TehsilName ?? "Unknown Tehsil";

                            else if (fieldName == "District")
                                return dbcontext.Districts.FirstOrDefault(d => d.DistrictId == value)?.DistrictName ?? "Unknown District";

                            else if (fieldName.EndsWith("Tehsil"))
                                return dbcontext.Tehsils.FirstOrDefault(t => t.TehsilId == value)?.TehsilName ?? "Unknown Tehsil";


                            else
                                return "Unknown Value";
                        }
                    }
                }
            }
            return "Unknown Value";
        }
        public dynamic GetSanctionDetails(string applicationId, string serviceId)
        {
            var formdetails = dbcontext.CitizenApplications.FirstOrDefault(fd => fd.ReferenceNumber == applicationId);
            // Get the Letters JSON string
            var lettersJson = dbcontext.Services
                         .FirstOrDefault(s => s.ServiceId == Convert.ToInt32(formdetails!.ServiceId))?.Letters;

            var parsed = JsonConvert.DeserializeObject<Dictionary<string, dynamic>>(lettersJson!);
            dynamic? sanctionSection = parsed!.TryGetValue("Sanction", out var sanction) ? sanction : null;
            var tableFields = sanctionSection!.tableFields;
            var sanctionLetterFor = sanctionSection.sanctionLetterFor;

            var details = dbcontext.CitizenApplications
                .FirstOrDefault(ca => ca.ReferenceNumber == applicationId);


            var formData = JsonConvert.DeserializeObject<JObject>(details!.FormDetails!);

            // Final key-value pair list for the PDF
            var pdfFields = new Dictionary<string, string>();

            foreach (var item in tableFields)
            {
                var formatted = GetFormattedValue(item, formData);
                string label = formatted.Label ?? "[Label Missing]";
                string value = formatted.Value ?? "";

                pdfFields[label] = value;
            }
            return Json(new { success = true, sanctionDetails = pdfFields });
        }
        private async Task<string> FetchAcknowledgementDetails(string applicationId)
        {
            // 1) Load the application record
            var details = dbcontext.CitizenApplications
                .FirstOrDefault(ca => ca.ReferenceNumber == applicationId)
                ?? throw new InvalidOperationException("Application not found.");

            string serviceName = dbcontext.Services.FirstOrDefault(s => s.ServiceId == details.ServiceId)?.ServiceName!;
            // 2) Load and parse the Letters JSON from the related service
            var lettersJson = (dbcontext.Services
                .FirstOrDefault(s => s.ServiceId == Convert.ToInt32(details.ServiceId))?.Letters) ?? throw new InvalidOperationException("No letters JSON configured for this service.");
            var parsedLetters = JsonConvert.DeserializeObject<Dictionary<string, dynamic>>(lettersJson!)
                ?? throw new InvalidOperationException("Letters JSON parsing failed.");

            // 3) Get the Acknowledgement section
            if (!parsedLetters.TryGetValue("Acknowledgement", out var ackSection))
                throw new InvalidOperationException("Acknowledgement section missing in Letters JSON.");

            var tableFields = (IEnumerable<dynamic>)ackSection.tableFields;

            // 4) Deserialize the form data for field lookup
            var formData = JsonConvert.DeserializeObject<JObject>(details.FormDetails!)
                ?? throw new InvalidOperationException("Form details parsing failed.");

            // 5) Build the key-value list for the PDF
            var acknowledgementDetails = new OrderedDictionary();



            // Add all fields from tableFields config (replace if duplicate keys)
            foreach (var fieldConfig in tableFields)
            {
                var formatted = GetFormattedValue(fieldConfig, formData);
                acknowledgementDetails[formatted.Label] = formatted.Value;
            }

            // Add Reference Number explicitly
            acknowledgementDetails["REFERENCE NUMBER"] = details.ReferenceNumber;

            // Add Date of Submission explicitly (replace if duplicate key)
            acknowledgementDetails["DATE OF SUBMISSION"] = details.CreatedAt?.ToString() ?? string.Empty;

            // 6) Generate the PDF
            await _pdfService.CreateAcknowledgement(acknowledgementDetails, applicationId, serviceName);

            // 7) Return the file path
            string fileName = applicationId.Replace("/", "_") + "Acknowledgement.pdf";
            // string path = $"files/{fileName}";

            // string fullPath = Path.Combine(_webHostEnvironment.ContentRootPath, "wwwroot", path);


            return "Base/DisplayFile?filename=" + fileName;
        }
        private JObject MapServiceFieldsFromForm(JObject formDetailsObj, JObject fieldMapping)
        {
            var formValues = new Dictionary<string, string>();

            // Step 1: Extract form field values
            foreach (var section in formDetailsObj.Properties())
            {
                if (section.Value is JArray fieldsArray)
                {
                    foreach (JObject field in fieldsArray)
                    {
                        var name = field["name"]?.ToString();
                        var value = field["value"]?.ToString()
                                    ?? field["File"]?.ToString()
                                    ?? field["Enclosure"]?.ToString();

                        if (!string.IsNullOrEmpty(name) && value != null)
                        {
                            formValues[name] = value;
                        }
                    }
                }
            }

            // Step 2: Replace with values, and convert District/Tehsil IDs
            JObject ReplaceKeys(JObject mapping)
            {
                var result = new JObject();

                foreach (var prop in mapping.Properties())
                {
                    if (prop.Value.Type == JTokenType.Object)
                    {
                        result[prop.Name] = ReplaceKeys((JObject)prop.Value);
                    }
                    else if (prop.Value.Type == JTokenType.String)
                    {
                        string lookupKey = prop.Value.ToString();
                        string? actualValue = null;

                        if (formValues.TryGetValue(lookupKey, out var rawValue))
                        {
                            if (lookupKey.Equals("District", StringComparison.OrdinalIgnoreCase) && int.TryParse(rawValue, out int districtId))
                            {
                                actualValue = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == districtId)?.DistrictName;
                            }
                            else if (lookupKey.Equals("Tehsil", StringComparison.OrdinalIgnoreCase) && int.TryParse(rawValue, out int tehsilId))
                            {
                                actualValue = dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == tehsilId)?.TehsilName;
                            }
                            else if (lookupKey.EndsWith("Tehsil", StringComparison.OrdinalIgnoreCase) && int.TryParse(rawValue, out int otherTehsilId))
                            {
                                actualValue = dbcontext.Tehsils.FirstOrDefault(t => t.TehsilId == otherTehsilId)?.TehsilName;
                            }
                            else
                            {
                                actualValue = rawValue;
                            }

                        }

                        result[prop.Name] = actualValue ?? "";
                    }
                    else
                    {
                        result[prop.Name] = prop.Value;
                    }
                }

                return result;
            }

            return ReplaceKeys(fieldMapping);
        }
        // Inside your controller or a service
        private static async Task<string> SendApiRequestAsync(string url, object payload)
        {
            using (var client = new HttpClient())
            {

                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(url, content);
                response.EnsureSuccessStatusCode(); // throws if not 2xx

                return await response.Content.ReadAsStringAsync();
            }
        }
        public static bool HasProperty<T>(string propertyName)
        {
            return typeof(T).GetProperty(propertyName) != null;
        }
        private static string? GetFormFieldValue(JObject formDetailsObj, string fieldName)
        {
            foreach (var section in formDetailsObj.Properties())
            {
                if (section.Value is JArray fieldsArray)
                {
                    foreach (JObject field in fieldsArray)
                    {
                        var name = field["name"]?.ToString();
                        if (name == fieldName)
                        {
                            // Prefer value, then File, then Enclosure
                            return field["value"]?.ToString()
                                ?? field["File"]?.ToString()
                                ?? field["Enclosure"]?.ToString();
                        }
                    }
                }
            }

            return null; // not found
        }

        public async Task<IActionResult> DisplayFile(string fileName)
        {
            var fileModel = await dbcontext.UserDocuments
                .FirstOrDefaultAsync(f => f.FileName == fileName);

            if (fileModel == null)
            {
                return NotFound("File not found.");
            }

            if (!fileModel.FileType.StartsWith("image/") && fileModel.FileType != "application/pdf")
            {
                return BadRequest("File is not an image or PDF.");
            }

            return File(fileModel.FileData, fileModel.FileType);
        }
    }
}
