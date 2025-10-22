using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Wards
{
    public int Uuid { get; set; }

    public int? MuncipalityId { get; set; }

    public int? WardCode { get; set; }

    public int? WardNo { get; set; }
}
