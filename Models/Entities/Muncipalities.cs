using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Muncipalities
{
    public int Uuid { get; set; }

    public int? DistrictId { get; set; }

    public int? MuncipalityId { get; set; }

    public string? MuncipalityName { get; set; }

    public int? MuncipalityType { get; set; }
}
