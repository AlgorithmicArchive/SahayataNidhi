using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class UserDocument
{
    public int FileId { get; set; }

    public string FileName { get; set; } = null!;

    public string FileType { get; set; } = null!;

    public int FileSize { get; set; }

    public byte[] FileData { get; set; } = null!;

    public DateTime UpdatedAt { get; set; }
}
