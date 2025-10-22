using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Villages
{
    public int Uuid { get; set; }

    public int? HalqaPanchayatId { get; set; }

    public int? VillageId { get; set; }

    public string? VillageName { get; set; }
}
