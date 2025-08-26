using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Branch
{
    public int BranchId { get; set; }

    public int BankId { get; set; }

    public string BranchName { get; set; } = null!;

    public string? Address { get; set; }

    public string? City1 { get; set; }

    public string? City2 { get; set; }

    public string? State { get; set; }

    public string? StdCode { get; set; }

    public string? Phone { get; set; }

    public virtual Bank Bank { get; set; } = null!;

    public virtual ICollection<IfscCode> IfscCodes { get; set; } = new List<IfscCode>();
}
