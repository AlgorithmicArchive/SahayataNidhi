using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class WebService
{
    public int Id { get; set; }

    public string? WebServiceName { get; set; }

    public int ServiceId { get; set; }

    public string ApiEndPoint { get; set; } = null!;

    public string OnAction { get; set; } = null!;

    public string FieldMappings { get; set; } = null!;

    public string CreatedAt { get; set; } = null!;

    public string UpdatedAt { get; set; } = null!;

    public bool IsActive { get; set; }

    public virtual Service Service { get; set; } = null!;
}
