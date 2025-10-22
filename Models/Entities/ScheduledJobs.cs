using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class ScheduledJobs
{
    public Guid Id { get; set; }

    public string CronExpression { get; set; } = null!;

    public string ActionType { get; set; } = null!;

    public DateTime? LastExecutedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? JsonParameters { get; set; }
}
