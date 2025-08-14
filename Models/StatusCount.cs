public class StatusCounts
{
    public int TotalApplications { get; set; }
    public int PendingCount { get; set; }
    public int ForwardedCount { get; set; }
    public int ForwardedSanctionedCount { get; set; }
    public int ReturnedCount { get; set; }
    public int ReturnToEditCount { get; set; }
    public int RejectCount { get; set; }
    public int SanctionedCount { get; set; }
    public int CorrigendumCount { get; set; }
    public int CorrigendumPendingCount { get; set; }
    public int CorrigendumForwardedCount { get; set; }
    public int CorrigendumReturnedCount { get; set; }
    public int CorrigendumRejectedCount { get; set; }
    public int CorrigendumSanctionedCount { get; set; }
    public int ForwardedSanctionedCorrigendumCount { get; set; } // Added for forwarded and sanctioned corrigendum
    public int CorrectionCount { get; set; }
    public int CorrectionPendingCount { get; set; }
    public int CorrectionForwardedCount { get; set; }
    public int CorrectionReturnedCount { get; set; }
    public int CorrectionRejectedCount { get; set; }
    public int CorrectionSanctionedCount { get; set; }
    public int ForwardedVerifiedCorrectionCount { get; set; } // Added for forwarded and verified correction
    public int TotalWithheldCount { get; set; }
    public int TemporaryWithheldCount { get; set; }
    public int PermanentWithheldCount { get; set; }
}