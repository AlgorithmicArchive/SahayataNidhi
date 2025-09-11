using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Bank
{
    public int BankId { get; set; }

    public string BankName { get; set; } = null!;

    public string? State { get; set; }
}
