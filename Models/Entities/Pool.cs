using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Pool
{
    public int PoolId { get; set; }

    public int ServiceId { get; set; }

    public string AccessLevel { get; set; } = null!;

    public int AccessCode { get; set; }

    public string? ListType { get; set; }

    public string? List { get; set; }

    public virtual Services Service { get; set; } = null!;
}
