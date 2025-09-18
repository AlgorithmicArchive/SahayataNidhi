using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class ApplicationsWithExpiringEligibility
{
    public int ExpiringId { get; set; }

    public int ServiceId { get; set; }

    public string ReferenceNumber { get; set; } = null!;

    public string ExpirationDate { get; set; } = null!;

    public int MailSent { get; set; }

    public DateOnly? CreatedAt { get; set; }
}
