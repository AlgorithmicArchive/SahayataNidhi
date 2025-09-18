using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class HalqaPanchayat
{
    public int Uuid { get; set; }

    public int? BlockId { get; set; }

    public int? HalqaPanchayatId { get; set; }

    public string? HalqaPanchayatName { get; set; }
}
