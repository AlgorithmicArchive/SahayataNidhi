using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Users
{
    public int UserId { get; set; }

    public string? Name { get; set; }

    public string? Username { get; set; }

    public string? Email { get; set; }

    public byte[]? Password { get; set; }

    public string? MobileNumber { get; set; }

    public string? Profile { get; set; }

    public string? UserType { get; set; }

    public string? BackupCodes { get; set; }

    public string? AdditionalDetails { get; set; }

    public bool IsEmailValid { get; set; }

    public string? RegisteredDate { get; set; }

    public virtual ICollection<AuditLogs> AuditLogs { get; set; } = new List<AuditLogs>();
}
