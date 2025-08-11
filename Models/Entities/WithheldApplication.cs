using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class WithheldApplication
{
    public int WithheldId { get; set; }

    public int ServiceId { get; set; }

    public string ReferenceNumber { get; set; } = null!;

    public bool IsWithheld { get; set; }

    public string WithheldType { get; set; } = null!;

    public string WithheldReason { get; set; } = null!;

    public int? MailSentToCitizen { get; set; }

    public DateOnly? WithheldOn { get; set; }
}
