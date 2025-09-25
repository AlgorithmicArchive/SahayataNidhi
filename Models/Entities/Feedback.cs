using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class Feedback
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Title { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string Files { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedOn { get; set; }
}
