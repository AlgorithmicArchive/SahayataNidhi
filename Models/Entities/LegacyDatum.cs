using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class LegacyDatum
{
    public string ReferenceNumber { get; set; } = null!;

    public int CitizenId { get; set; }

    public int ServiceId { get; set; }

    public string? DistrictUidForBank { get; set; }

    public string? FormDetails { get; set; }

    public string? WorkFlow { get; set; }

    public string? AdditionalDetails { get; set; }

    public int? CurrentPlayer { get; set; }

    public string? Status { get; set; }

    public string? CreatedAt { get; set; }
}
