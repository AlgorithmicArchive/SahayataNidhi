using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Tswotehsil
{
    public int? DivisionCode { get; set; }

    public int? DistrictId { get; set; }

    public int? TehsilId { get; set; }

    public string? TehsilName { get; set; }

    public string? TswoOfficeName { get; set; }
}
