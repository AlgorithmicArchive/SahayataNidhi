using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Block
{
    public int Uuid { get; set; }

    public int? DistrictId { get; set; }

    public int? BlockId { get; set; }

    public string? BlockName { get; set; }
}
