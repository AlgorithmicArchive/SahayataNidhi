using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Bank
{
    public int BankId { get; set; }

    public string BankName { get; set; } = null!;

    public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();
}
