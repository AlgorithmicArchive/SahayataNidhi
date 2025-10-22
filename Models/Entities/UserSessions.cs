using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class UserSessionss
{
    public Guid SessionId { get; set; }

    public int UserId { get; set; }

    public string JwtToken { get; set; } = null!;

    public DateTime LoginTime { get; set; }

    public DateTime LastActivityTime { get; set; }
}
