

private void ReplaceCodeFieldsWithNames(JToken formDetails)
{
    var lookupMap = new Dictionary<string, Func<int, string>>
    {
        { "District", GetDistrictName },
        { "Tehsil", id => dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == id)?.TehsilName ?? "" },
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

    // If value is null or empty, skip processing
    if (string.IsNullOrEmpty(valueStr)) return;

    // Check if the value is already a non-numeric string (e.g., "Jammu")
    if (!int.TryParse(valueStr, out int code))
    {
        // If the field is in lookupMap or ends with a lookupMap key, assume it's already a name and skip
        if (lookupMap.Keys.Any(key => name.Equals(key, StringComparison.OrdinalIgnoreCase) || 
                                     name.EndsWith(key, StringComparison.OrdinalIgnoreCase)))
        {
            return; // Preserve the string value (e.g., "Jammu")
        }
        // If not in lookupMap, continue to avoid modifying unexpected fields
        return;
    }

    // Process numeric code for fields in lookupMap
    foreach (var key in lookupMap.Keys)
    {
        if (name.Equals(key, StringComparison.OrdinalIgnoreCase))
        {
            field["value"] = lookupMap[key](code);
            return;
        }
    }

    // Check suffix matches only if no exact match
    foreach (var key in lookupMap.Keys)
    {
        if (name.EndsWith(key, StringComparison.OrdinalIgnoreCase))
        {
            field["value"] = lookupMap[key](code);
            return;
        }
    }
}