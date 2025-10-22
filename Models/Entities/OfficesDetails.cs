using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class OfficesDetails
{
    public int StateCode { get; set; }

    public int Divisioncode { get; set; }

    public int DistrictCode { get; set; }

    public int AreaCode { get; set; }

    public string AreaName { get; set; } = null!;

    public string OfficeName { get; set; } = null!;

    public int OfficeType { get; set; }
}
