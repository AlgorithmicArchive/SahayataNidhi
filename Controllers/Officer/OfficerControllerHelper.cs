using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers.Officer
{
    public partial class OfficerController : Controller
    {

        public static string FormatKey(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            // Use Regex to insert space before each capital letter, except for the first one
            string result = Regex.Replace(input, "(?<!^)([A-Z])", " $1");

            return result;
        }
        public string GetDistrictName(int districtId)
        {
            return dbcontext.Districts.FirstOrDefault(d => d.DistrictId == districtId)!.DistrictName!;
        }
        public string GetTehsilName(int tehsilId)
        {
            return dbcontext.Tehsils.FirstOrDefault(d => d.TehsilId == tehsilId)!.TehsilName!;
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

        public int GetCountPerDistrict(int districtId, int serviceId)
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
                districtId, serviceId, financialYear, "Corrigendum", newCountParam
            );

            // Retrieve the output value
            return (int)newCountParam.Value;
        }



        private dynamic GetFormattedValue(dynamic item, JObject data)
        {
            if (item == null)
                return new { Label = "[No Label]", Value = "[Item is null]" };

            string label = item.label?.ToString() ?? "[No Label]";
            string fmt = item.transformString?.ToString() ?? "{0}";

            if (!Regex.IsMatch(fmt, @"\{\d+\}"))
                return new { Label = label, Value = fmt };

            // 1) Build rawValues, filtering out empty values
            var rawValues = (item.selectedFields as IEnumerable<object> ?? Enumerable.Empty<object>())
                .Select(sf =>
                {
                    var name = sf?.ToString() ?? "";
                    if (string.IsNullOrWhiteSpace(name)) return null;
                    var fieldObj = FindFieldRecursively(data, name);
                    var value = fieldObj == null ? "" : ExtractValueWithSpecials(fieldObj, name);
                    return string.IsNullOrWhiteSpace(value) ? null : value;
                })
                .Where(v => v != null)
                .ToList();

            // 2) Find highest non-empty index
            int lastIndex = rawValues.Count - 1;
            if (lastIndex < 0)
                return new { Label = label, Value = "" };

            // 3) Tokenize into placeholders and literals
            var tokens = Regex.Split(fmt, @"(\{\d+\})").ToList();

            // 4) Find the first placeholder whose index > lastIndex
            int badTokenIdx = tokens
                .Select((tok, idx) => new { tok, idx })
                .FirstOrDefault(x =>
                {
                    var m = Regex.Match(x.tok, @"\{(\d+)\}");
                    return m.Success && int.Parse(m.Groups[1].Value) > lastIndex;
                })
                ?.idx ?? tokens.Count;

            // 5) Collect tokens up to badTokenIdx
            var kept = tokens.Take(badTokenIdx).ToList();

            // 6) If the last kept token is a literal and contains ')', trim it at the first ')'
            if (kept.Count > 0 && !Regex.IsMatch(kept.Last(), @"\{\d+\}"))
            {
                var lit = kept.Last();
                int p = lit.IndexOf(')');
                if (p >= 0)
                    kept[kept.Count - 1] = lit.Substring(0, p + 1);
            }

            // 7) Rebuild, skipping empty placeholders and their preceding literals
            var sb = new StringBuilder();
            for (int i = 0; i < kept.Count; i++)
            {
                var tok = kept[i];
                var m = Regex.Match(tok, @"\{(\d+)\}");
                if (m.Success)
                {
                    int idx = int.Parse(m.Groups[1].Value);
                    if (idx <= lastIndex && !string.IsNullOrWhiteSpace(rawValues[idx]))
                    {
                        // Append the preceding literal (if it exists and is not empty) before the value
                        if (i > 0 && !Regex.IsMatch(kept[i - 1], @"\{\d+\}") && !string.IsNullOrWhiteSpace(kept[i - 1]))
                        {
                            sb.Append(kept[i - 1]);
                        }
                        sb.Append(rawValues[idx]);
                    }
                    else
                    {
                        // Skip the preceding literal if the placeholder is empty
                        if (i > 0 && !Regex.IsMatch(kept[i - 1], @"\{\d+\}"))
                        {
                            i--; // Backtrack to skip the preceding literal
                        }
                    }
                }
                else if (i + 1 >= kept.Count || !Regex.IsMatch(kept[i + 1], @"\{\d+\}"))
                {
                    // Append standalone literals not followed by a placeholder
                    if (!string.IsNullOrWhiteSpace(tok))
                    {
                        sb.Append(tok);
                    }
                }
            }

            // 8) Clean up multiple commas and trailing commas/spaces
            var result = Regex.Replace(sb.ToString().TrimEnd(), @",(\s*,)*\s*$", "");
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

            if (fieldName.Equals("Tehsil", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(s, out int tid))
                return dbcontext.Tswotehsils.FirstOrDefault(m => m.TehsilId == tid)!.TehsilName!;

            if (fieldName.EndsWith("Tehsil", StringComparison.OrdinalIgnoreCase)
               && int.TryParse(s, out int Tid))
                return dbcontext.Tehsils.FirstOrDefault(m => m.TehsilId == Tid)!.TehsilName!;

            if (fieldName.Contains("Muncipality", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(s, out int mid))
                return dbcontext.Muncipalities.FirstOrDefault(m => m.MuncipalityId == mid)!.MuncipalityName!;

            if (fieldName.Contains("Block", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(s, out int bid))
                return dbcontext.Blocks.FirstOrDefault(m => m.BlockId == bid)!.BlockName!;

            if (fieldName.Contains("Ward", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(s, out int wid))
                return dbcontext.Wards.FirstOrDefault(m => m.WardCode == wid)!.WardNo.ToString()!;

            if (fieldName.Contains("Village", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(s, out int vid))
                return dbcontext.Villages.FirstOrDefault(m => m.VillageId == vid)!.VillageName!;

            return s;
        }
        [HttpGet]
        public IActionResult GetCertificateDetails()
        {
            var officer = GetOfficerDetails();
            try
            {
                var certificateDetails = dbcontext.Certificates
                    .Where(ce => ce.OfficerId == officer.UserId)
                    .Select(c => new
                    {
                        serial_number = Convert.ToHexString(c.SerialNumber!), // Convert to hex string
                        certifying_authority = c.CertifiyingAuthority,
                        expiration_date = c.ExpirationDate
                    })
                    .FirstOrDefault();

                _logger.LogInformation($"-------Certificate Details: {JsonConvert.SerializeObject(certificateDetails)}-------------------------------");

                if (certificateDetails == null)
                {
                    return NotFound(new { success = false, message = "No certificate found for this officer." });
                }

                return Json(new
                {
                    success = true,
                    certificateDetails
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching certificate details for User ID: {UserId}", officer?.UserId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
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

        public JToken ReorderFormDetails(JToken formDetailsToken, string applicationId, bool isSanctioned)
        {
            if (formDetailsToken is not JObject formDetailsObject)
                return formDetailsToken;

            // Fetch sanctioned corrigendums
            var corrigendums = dbcontext.Corrigenda
                .Where(co => co.ReferenceNumber == applicationId && co.Status == "Sanctioned")
                .ToList();

            // Ensure "Documents" array exists
            if (!formDetailsObject.ContainsKey("Documents") || formDetailsObject["Documents"] is not JArray)
            {
                formDetailsObject["Documents"] = new JArray();
            }

            var documentsArray = (JArray)formDetailsObject["Documents"]!;

            // Filter out "Other" with "Please Select"
            var filteredDocs = new JArray(
                documentsArray.Where(doc =>
                    doc["name"]?.ToString() != "Other" || doc["Enclosure"]?.ToString() != "Please Select")
            );

            // Add main Sanction Letter if sanctioned
            if (isSanctioned)
            {
                filteredDocs.Add(new JObject
                {
                    { "label", "Sanction Letter" },
                    { "name", "Sanction Letter" },
                    { "Enclosure", "Sanction Letter" },
                    { "File", applicationId.Replace("/", "_") + "_SanctionLetter.pdf" }
                });
            }

            // Add Corrigendum Sanction Letters
            foreach (var corrigendum in corrigendums)
            {
                filteredDocs.Add(new JObject
                {
                    { "label", "Corrigendum Sanction Letter" },
                    { "name", "Corrigendum Sanction Letter" },
                    { "Enclosure", "Corrigendum Sanction Letter" },
                    { "File", corrigendum.CorrigendumId.Replace("/", "_") + "_CorrigendumSanctionLetter.pdf" }
                });
            }

            formDetailsObject["Documents"] = filteredDocs;

            // Reorder Location and Applicant Details to the top
            if (!formDetailsObject.ContainsKey("Location") || !formDetailsObject.ContainsKey("Applicant Details"))
                return formDetailsToken;

            var locationSection = formDetailsObject.Property("Location");
            var applicantSection = formDetailsObject.Property("Applicant Details");

            locationSection?.Remove();
            applicantSection?.Remove();

            JObject reordered = new JObject
            {
                { "Location", locationSection!.Value },
                { "Applicant Details", applicantSection!.Value }
            };

            foreach (var prop in formDetailsObject.Properties())
            {
                if (prop.Name != "Location" && prop.Name != "Applicant Details")
                {
                    reordered.Add(prop.Name, prop.Value);
                }
            }

            return reordered;
        }

        public string? GetSanctionedCorrigendum(dynamic WorkFlow, string id)
        {
            foreach (var item in WorkFlow)
            {
                if ((string)item.status == "sanctioned")
                {
                    return id;
                }
            }

            return null; // Return 0 only if no "sanctioned" status was found
        }




        private static string FormatSectionKey(string key)
        {
            if (string.IsNullOrEmpty(key)) return key;

            // Convert camelCase to Title Case with spaces
            var result = Regex.Replace(key, "([a-z])([A-Z])", "$1 $2");
            return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(result);
        }

        // Helper method to format field labels
        private static string FormatFieldLabel(string label)
        {
            if (string.IsNullOrEmpty(label)) return label;

            // Ensure proper formatting for labels
            return label.EndsWith(":") ? label : $"{label}:";
        }

        // Helper method to convert values for display (similar to your existing logic)
        private string ConvertValueForDisplay(string label, string value)
        {
            if (string.IsNullOrEmpty(value)) return value;

            // Convert integer values for District and Tehsil fields
            if (label.Contains("District", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out int districtId))
            {
                return GetDistrictName(districtId);
            }
            else if (label.Contains("Tehsil", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out int tehsilId))
            {
                return GetTehsilName(tehsilId);
            }
            else if (label.Contains("Muncipality", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out int muncipalityId))
            {
                return dbcontext.Muncipalities.FirstOrDefault(m => m.MuncipalityId == muncipalityId)!.MuncipalityName!;
            }
            else if (label.Contains("Block", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out int BlockId))
            {
                return dbcontext.Blocks.FirstOrDefault(m => m.BlockId == BlockId)!.BlockName!;
            }
            else if (label.Contains("Ward", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out int WardId))
            {
                return dbcontext.Wards.FirstOrDefault(m => m.WardCode == WardId)!.WardNo.ToString()!;
            }
            else if (label.Contains("Village", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out int VillageId))
            {
                return dbcontext.Villages.FirstOrDefault(m => m.VillageId == VillageId)!.VillageName!;
            }

            return value;
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


        private void UpdateOfficerActionFormLabels(JObject officerClone, dynamic formDetails)
        {
            // Extract officer roles (from Users table's JSON AdditionalDetails field)
            // Step 1: Pull data to memory (client-side)
            var officerRoles = dbcontext.Users
                .Where(u => u.UserType == "Officer" && u.AdditionalDetails != null)
                .AsEnumerable() // Forces evaluation on the client side
                .Select(u => JsonConvert.DeserializeObject<Dictionary<string, dynamic>>(u.AdditionalDetails!))
                .Where(details => details != null && details.ContainsKey("Role"))
                .Select(details => details!["Role"])
                .Distinct()
                .ToList();


            if (officerClone.TryGetValue("actionForm", out var actionFormToken) && actionFormToken is JArray actionFormArray)
            {
                foreach (var field in actionFormArray.Children<JObject>())
                {
                    if (field.TryGetValue("options", out var optionsToken) && optionsToken is JArray optionsArray)
                    {
                        foreach (var option in optionsArray.Children<JObject>())
                        {
                            string? label = option["label"]?.ToString();
                            if (string.IsNullOrWhiteSpace(label)) continue;

                            foreach (var role in officerRoles)
                            {
                                if (label.Contains(role!, StringComparison.OrdinalIgnoreCase))
                                {
                                    string area = GetOfficerArea(role, formDetails);
                                    option["label"] = $"{label} {area}";
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        private void ReplaceCodeFieldsWithNames(JToken formDetails)
        {
            var lookupMap = new Dictionary<string, Func<int, string>>
            {
                { "District", GetDistrictName },
                { "Tehsil", id=>dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == id)?.TehsilName ?? "" },
                { "PresentTehsil", id => dbcontext.Tehsils.FirstOrDefault(t => t.TehsilId == id)?.TehsilName ?? "" },
                { "PermanentTehsil", id => dbcontext.Tehsils.FirstOrDefault(t => t.TehsilId == id)?.TehsilName ?? "" },
                { "Muncipality", id => dbcontext.Muncipalities.FirstOrDefault(m => m.MuncipalityId == id)?.MuncipalityName ?? "" },
                { "Block", id => dbcontext.Blocks.FirstOrDefault(m => m.BlockId == id)?.BlockName ?? "" },
                { "HalqaPanchayat", id => dbcontext.HalqaPanchayats.FirstOrDefault(m => m.HalqaPanchayatId == id)?.HalqaPanchayatName ?? "" },
                { "Village", id => dbcontext.Villages.FirstOrDefault(m => m.VillageId == id)?.VillageName ?? "" },
                { "WardNo", id => dbcontext.Wards.FirstOrDefault(w => w.WardCode == id)?.WardNo.ToString() ?? "" }
            };

            foreach (var section in formDetails.Children<JProperty>())
            {
                foreach (var fieldToken in section.Value.Children<JObject>())
                {
                    ProcessField(fieldToken, lookupMap);

                    if (fieldToken["additionalFields"] is JArray additionalFields)
                    {
                        foreach (var additional in additionalFields.OfType<JObject>())
                            ProcessField(additional, lookupMap);
                    }
                }
            }
        }

        private static void ProcessField(JObject field, Dictionary<string, Func<int, string>> lookupMap)
        {
            var name = field["name"]?.ToString() ?? "";
            var valueStr = field["value"]?.ToString();

            if (!int.TryParse(valueStr, out int code)) return;

            foreach (var key in lookupMap.Keys)
            {
                if (name.EndsWith(key, StringComparison.OrdinalIgnoreCase))
                {
                    field["value"] = lookupMap[key](code);
                    break;
                }
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
        private void FormatDateFields(JToken formDetails)
        {
            foreach (var section in formDetails.Children<JProperty>())
            {
                foreach (var field in section.Value.Children<JObject>())
                {
                    TryFormatDate(field);

                    if (field["additionalFields"] is JArray additionalFields)
                    {
                        foreach (var additional in additionalFields.OfType<JObject>())
                            TryFormatDate(additional);
                    }
                }
            }
        }

        private static void TryFormatDate(JObject field)
        {
            if (DateTime.TryParse(field["value"]?.ToString(), out DateTime dt))
            {
                field["value"] = dt.ToString("dd MMM yyyy");
            }
        }

        private static void UpdateWorkflowFlags(JArray officerArray, int currentPlayerId)
        {
            var previousOfficer = officerArray
                .FirstOrDefault(o => (int)o["playerId"]! == (currentPlayerId - 1));

            var nextOfficer = officerArray
                .FirstOrDefault(o => (int)o["playerId"]! == (currentPlayerId + 1));

            if (previousOfficer != null)
                previousOfficer["canPull"] = false;

            if (nextOfficer != null)
                nextOfficer["canPull"] = false;
        }
        private void InjectEditableActionForm(JObject currentOfficerClone, Service? serviceDetails, int currentPlayer)
        {
            if (string.IsNullOrWhiteSpace(serviceDetails?.OfficerEditableField))
                return;

            var editableFields = JsonConvert.DeserializeObject<List<JObject>>(serviceDetails.OfficerEditableField);
            int playerId = (int)currentOfficerClone["playerId"]!;

            var match = editableFields?.FirstOrDefault(f => (int)f["playerId"]! == playerId);
            if (match != null && match["actionForm"] != null)
            {
                currentOfficerClone["actionForm"] = match["actionForm"];
            }
        }

        // Helper method to build main application counts
        private List<object> BuildMainApplicationCounts(StatusCounts counts, dynamic authorities)
        {
            var countList = new List<object>
            {
                new { label = "Total Applications", count = counts.TotalApplications, bgColor = "#000000", textColor = "#FFFFFF" },
                new { label = "Pending", count = counts.PendingCount, bgColor = "#FFC107", textColor = "#212121" }
            };

            if ((bool)authorities.CanForwardToPlayer)
            {
                countList.Add(new
                {
                    label = "Forwarded",
                    count = counts.ForwardedCount,
                    bgColor = "#64B5F6",
                    textColor = "#0D47A1",
                    forwardedSanctionedCount = counts.ForwardedCount > 0 ? counts.ForwardedSanctionedCount : (int?)null
                });
            }

            if ((bool)authorities.CanReturnToPlayer)
            {
                countList.Add(new
                {
                    label = "Returned",
                    count = counts.ReturnedCount,
                    bgColor = "#E0E0E0",
                    textColor = "#212121"
                });
            }

            if ((bool)authorities.CanReturnToCitizen)
            {
                countList.Add(new
                {
                    label = "Pending With Citizen",
                    count = counts.ReturnToEditCount,
                    bgColor = "#CE93D8",
                    textColor = "#4A148C",
                    tooltipText = "Application is pending at Citizen level for correction."
                });
            }

            countList.Add(new
            {
                label = "Rejected",
                count = counts.RejectCount,
                bgColor = "#FF7043",
                textColor = "#B71C1C"
            });

            if ((bool)authorities.CanSanction)
            {
                countList.Add(new
                {
                    label = "Sanctioned",
                    count = counts.SanctionedCount,
                    bgColor = "#81C784",
                    textColor = "#1B5E20"
                });
            }

            return countList;
        }

        // Helper method to build corrigendum counts
        private List<object> BuildCorrigendumCounts(StatusCounts counts, dynamic authorities)
        {
            var corrigendumList = new List<object>
    {
        new
        {
            label = "Total Corrigendum",
            name = "corrigendum",
            count = counts.CorrigendumCount,
            bgColor = "#6A1B9A",
            textColor = "#FFFFFF"
        },
        new
        {
            label = "Pending",
            name = "corrigendum",
            count = counts.CorrigendumPendingCount,
            bgColor = "#FFC107",
            textColor = "#212121"
        }
    };

            if ((bool)authorities.CanForwardToPlayer)
            {
                corrigendumList.Add(new
                {
                    label = "Forwarded",
                    name = "corrigendum",
                    count = counts.CorrigendumForwardedCount,
                    bgColor = "#64B5F6",
                    textColor = "#0D47A1"
                });
            }

            if ((bool)authorities.CanReturnToPlayer)
            {
                corrigendumList.Add(new
                {
                    label = "Returned",
                    name = "corrigendum",
                    count = counts.CorrigendumReturnedCount,
                    bgColor = "#E0E0E0",
                    textColor = "#212121"
                });
            }

            corrigendumList.Add(new
            {
                label = "Rejected",
                name = "corrigendum",
                count = counts.CorrigendumRejectedCount,
                bgColor = "#FF7043",
                textColor = "#B71C1C"
            });

            if ((bool)authorities.CanSanction)
            {
                corrigendumList.Add(new
                {
                    label = "Issued",
                    name = "corrigendum",
                    count = counts.CorrigendumSanctionedCount,
                    bgColor = "#81C784",
                    textColor = "#1B5E20"
                });
            }

            return corrigendumList;
        }

        // Helper method to build correction counts
        private List<object> BuildCorrectionCounts(StatusCounts counts, dynamic authorities)
        {
            var correctionList = new List<object>
            {
                new
                {
                    label = "Total Correction",
                    name = "correction",
                    count = counts.CorrectionCount,
                    bgColor = "#6A1B9A",
                    textColor = "#FFFFFF"
                },
                new
                {
                    label = "Pending",
                    name = "correction",
                    count = counts.CorrectionPendingCount,
                    bgColor = "#FFC107",
                    textColor = "#212121"
                }
            };

            if ((bool)authorities.CanForwardToPlayer)
            {
                correctionList.Add(new
                {
                    label = "Forwarded",
                    name = "correction",
                    count = counts.CorrectionForwardedCount,
                    bgColor = "#64B5F6",
                    textColor = "#0D47A1"
                });
            }

            if ((bool)authorities.CanReturnToPlayer)
            {
                correctionList.Add(new
                {
                    label = "Returned",
                    name = "correction",
                    count = counts.CorrectionReturnedCount,
                    bgColor = "#E0E0E0",
                    textColor = "#212121"
                });
            }

            correctionList.Add(new
            {
                label = "Rejected",
                name = "correction",
                count = counts.CorrectionRejectedCount,
                bgColor = "#FF7043",
                textColor = "#B71C1C"
            });

            if ((bool)authorities.CanSanction)
            {
                correctionList.Add(new
                {
                    label = "Issued",
                    name = "correction",
                    count = counts.CorrectionSanctionedCount,
                    bgColor = "#81C784",
                    textColor = "#1B5E20"
                });
            }

            return correctionList;
        }



    }
}