using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Corrigendum
{
    public string CorrigendumId { get; set; } = null!;

    public string ReferenceNumber { get; set; } = null!;

    public string? Location { get; set; }

    public string CorrigendumFields { get; set; } = null!;

    public string WorkFlow { get; set; } = null!;

    public int CurrentPlayer { get; set; }

    public string? Type { get; set; }

    public string? History { get; set; }

    public string? Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual CitizenApplication ReferenceNumberNavigation { get; set; } = null!;
}
