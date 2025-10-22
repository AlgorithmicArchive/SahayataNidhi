using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class BankDetails
{
    public string? Bank { get; set; }

    public string? Ifsc { get; set; }

    public string? Branch { get; set; }

    public string? Address { get; set; }

    public string? City1 { get; set; }

    public string? City2 { get; set; }

    public string? State { get; set; }

    public string? StdCode { get; set; }

    public string? Phone { get; set; }
}
