using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class IfscCode
{
    public int IfscId { get; set; }

    public int BranchId { get; set; }

    public string IfscCode1 { get; set; } = null!;
}
