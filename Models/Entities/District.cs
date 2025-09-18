using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class District
{
    public int DistrictId { get; set; }

    public string? DistrictName { get; set; }

    public string? DistrictShort { get; set; }

    public int Division { get; set; }

    public int? Uuid { get; set; }
}
