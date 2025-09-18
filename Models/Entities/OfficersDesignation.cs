using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class OfficersDesignation
{
    public int Uuid { get; set; }

    public string? Designation { get; set; }

    public string? DesignationShort { get; set; }

    public string? AccessLevel { get; set; }
}
