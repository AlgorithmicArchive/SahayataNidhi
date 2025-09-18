using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class AuditLog
{
    public int LogId { get; set; }

    public int UserId { get; set; }

    public string Action { get; set; } = null!;

    public string Description { get; set; } = null!;

    public DateTime Timestamp { get; set; }

    public string IpAddress { get; set; } = null!;

    public string Browser { get; set; } = null!;

    public string OperatingSystem { get; set; } = null!;

    public string Device { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string? AdditionalData { get; set; }

    public virtual User User { get; set; } = null!;
}
