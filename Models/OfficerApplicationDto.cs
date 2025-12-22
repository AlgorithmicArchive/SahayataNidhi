public class OfficerApplicationDto
{
    public string? ReferenceNumber { get; set; }
    public string? ReferenceNumberAlphaNumeric { get; set; }
    public int? Citizen_id { get; set; }
    public int ServiceId { get; set; }
    public string? DistrictUidForBank { get; set; }
    public string? FormDetails { get; set; }
    public string? WorkFlow { get; set; }
    public string? AdditionalDetails { get; set; }
    public int? CurrentPlayer { get; set; }
    public string? Status { get; set; }
    public string? DataType { get; set; }
    public string? Created_at { get; set; }

    // New dynamic location fields
    public string? DivisionName { get; set; }   // Only for State level
    public string? DistrictName { get; set; }   // For State & Division
    public string? TehsilName { get; set; }     // For Division & District
}