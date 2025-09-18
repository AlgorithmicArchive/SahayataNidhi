using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class ApplicationPerDistrict
{
    public int Uuid { get; set; }

    public string? Type { get; set; }

    public int DistrictId { get; set; }

    public int? ServiceId { get; set; }

    public string? FinancialYear { get; set; }

    public int CountValue { get; set; }
}
