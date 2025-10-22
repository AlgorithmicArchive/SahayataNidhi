using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class MuncipalityTypes
{
    public int Uuid { get; set; }

    public int? TypeCode { get; set; }

    public string? TypeName { get; set; }
}
