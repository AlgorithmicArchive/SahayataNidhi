using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class EmailSetting
{
    public int Id { get; set; }

    public string SenderName { get; set; } = null!;

    public string SenderEmail { get; set; } = null!;

    public string SmtpServer { get; set; } = null!;

    public int SmtpPort { get; set; }

    public string Password { get; set; } = null!;

    public string? Templates { get; set; }
}
