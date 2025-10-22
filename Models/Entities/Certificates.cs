using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Certificates
{
    public int Uuid { get; set; }

    public int OfficerId { get; set; }

    public byte[]? SerialNumber { get; set; }

    public string? CertifiyingAuthority { get; set; }

    public DateTime? ExpirationDate { get; set; }

    public string? RegisteredDate { get; set; }
}
