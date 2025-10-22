using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SahayataNidhi.Models.Entities;
using Wangkanai.Detection.Services;

public interface IAuditLogService
{
    void InsertLog(HttpContext context, string action, string description, int? userId = null, string status = "");
}

public class AuditLogService : IAuditLogService
{
    private readonly IDetectionService _detection;
    private readonly SwdjkContext _dbcontext;

    public AuditLogService(IDetectionService detection, SwdjkContext dbcontext)
    {
        _detection = detection;
        _dbcontext = dbcontext;
    }

    public void InsertLog(HttpContext httpContext, string action, string description, int? userId = null, string status = "")
    {
        try
        {
            if (userId == null)
            {
                var claim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                userId = string.IsNullOrEmpty(claim) ? 0 : Convert.ToInt32(claim);
            }

            string ipAddress = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                              ?? httpContext.Connection.RemoteIpAddress?.ToString()
                              ?? "Unknown";

            string browser = _detection.Browser.Name.ToString();
            string browserVersion = _detection.Browser.Version.ToString();
            string device = _detection.Device.Type.ToString();
            string platform = _detection.Platform.Name.ToString();

            var log = new AuditLogs
            {
                UserId = userId ?? 0,
                Action = action,
                Description = description,
                IpAddress = ipAddress,
                Browser = $"{browser} {browserVersion}",
                OperatingSystem = platform,
                Device = device,
                Status = status,
            };

            _dbcontext.AuditLogs.Add(log);
            _dbcontext.SaveChanges();

        }
        catch
        {
            // Optional: Log the exception somewhere
        }
    }
}
