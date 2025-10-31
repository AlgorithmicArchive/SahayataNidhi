using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;
using System.Reflection;

public class CronServices
{
    private readonly SwdjkContext _dbcontext;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<CronServices> _logger;
    private readonly ICronScheduler _scheduler;

    public CronServices(
        SwdjkContext dbcontext,
        IEmailSender emailSender,
        ILogger<CronServices> logger,
        ICronScheduler scheduler)
    {
        _dbcontext = dbcontext;
        _emailSender = emailSender;
        _logger = logger;
        _scheduler = scheduler;
    }

    // === Task: Notify Expiring Eligibilities ===
    public async Task NotifyExpiringEligibilities(string? serviceId = "1", CancellationToken ct = default)
    {
        if (!int.TryParse(serviceId, out int svcId))
        {
            _logger.LogWarning("Invalid ServiceId: {ServiceId}", serviceId);
            return;
        }

        string accessLevel = "State";
        int? accessCode = 0;
        string takenBy = "";
        int? divisionCode = null;
        string resultType = "expiringeligibility";
        int pageIndex = 0, pageSize = 10;

        var applications = await _dbcontext.CitizenApplications
            .FromSqlRaw(
                "EXEC [dbo].[GetDisabilityApplications] @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode, @ResultType, @PageNumber, @PageSize",
                new SqlParameter("@AccessLevel", accessLevel),
                new SqlParameter("@AccessCode", accessCode ?? (object)DBNull.Value),
                new SqlParameter("@ServiceId", svcId),
                new SqlParameter("@TakenBy", takenBy),
                new SqlParameter("@DivisionCode", divisionCode ?? (object)DBNull.Value),
                new SqlParameter("@ResultType", resultType),
                new SqlParameter("@PageNumber", pageIndex + 1),
                new SqlParameter("@PageSize", pageSize))
            .ToListAsync(ct);

        int mailSentCount = 0;

        foreach (var application in applications)
        {
            if (ct.IsCancellationRequested) break;

            var formDetailsObj = JToken.Parse(application.FormDetails ?? "{}");
            string applicantName = formDetailsObj["ApplicantName"]?.ToString() ?? "";
            string email = formDetailsObj["Email"]?.ToString() ?? "";

            if (string.IsNullOrEmpty(email)) continue;

            var expiringApplication = await _dbcontext.ApplicationsWithExpiringEligibility
                .FirstOrDefaultAsync(ae => ae.ReferenceNumber == application.ReferenceNumber, ct);

            if (expiringApplication == null) continue;

            DateTime expirationDate = DateTime.Parse(expiringApplication.ExpirationDate);
            string htmlMessage = $@"
                <div style='font-family: Arial, sans-serif;'>
                    <h2 style='color: #2e6c80;'>UDID Card Validity Expiring</h2>
                    <p><strong>{applicantName}</strong>,</p>
                    <p>
                        Your UDID Card linked to application <strong>{application.ReferenceNumber}</strong>
                        is expiring on <strong>{expirationDate:dd MMM yyyy}</strong>.
                    </p>
                    <p>Please renew your UDID card to continue receiving financial assistance.</p>
                </div>";

            expiringApplication.MailSent++;
            await _dbcontext.SaveChangesAsync(ct);
            await _emailSender.SendEmail(email, "UDID Card Expiry Notification", htmlMessage);
            mailSentCount++;
        }

        _logger.LogInformation("Processed {Count} applications, sent {Mails} mails", applications.Count, mailSentCount);
    }

    // === Self-register all public async Task methods (excluding RegisterAllTasksAsync) ===
    public async Task RegisterAllTasksAsync(string cronExpression = "0 9 * * *", CancellationToken ct = default)
    {
        var methods = GetType()
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => m.ReturnType == typeof(Task) && m.Name != nameof(RegisterAllTasksAsync))
            .ToList();

        foreach (var method in methods)
        {
            string actionType = method.Name;

            // Build delegate with default args
            var action = async (CancellationToken token) =>
            {
                var parameters = method.GetParameters();
                var args = new object?[parameters.Length];

                for (int i = 0; i < parameters.Length; i++)
                {
                    var p = parameters[i];
                    if (p.ParameterType == typeof(string) && p.HasDefaultValue)
                        args[i] = p.DefaultValue;
                    else if (p.ParameterType == typeof(string))
                        args[i] = "1"; // default serviceId
                    else if (p.ParameterType == typeof(CancellationToken))
                        args[i] = token;
                    else
                        args[i] = null;
                }

                await (Task)method.Invoke(this, args)!;
            };

            await _scheduler.ScheduleTaskAsync(cronExpression, actionType, action);
            _logger.LogInformation("Registered and scheduled {MethodName} with CRON {Cron}", actionType, cronExpression);
        }
    }
}