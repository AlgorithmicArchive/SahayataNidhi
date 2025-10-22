using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class WithheldApplications
{
    public int WithheldId { get; set; }

    public int ServiceId { get; set; }

    public string ReferenceNumber { get; set; } = null!;

    public string? Location { get; set; }

    public string? WorkFlow { get; set; }

    public int? CurrentPlayer { get; set; }

    public string? History { get; set; }

    public bool IsWithheld { get; set; }

    public string WithheldType { get; set; } = null!;

    public string WithheldReason { get; set; } = null!;

    public string? Files { get; set; }

    public string? Status { get; set; }

    public DateOnly? WithheldOn { get; set; }
}
