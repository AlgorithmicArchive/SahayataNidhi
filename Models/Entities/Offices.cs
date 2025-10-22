using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Offices
{
    public int OfficeId { get; set; }

    public int DepartmentId { get; set; }

    public string OfficeName { get; set; } = null!;

    public string OfficeShort { get; set; } = null!;

    public string AccessLevel { get; set; } = null!;
}
