using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;
using System;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

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
    public async Task NotifyExpiringEligibilities(string? serviceId = "1")
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

        var applications = await _dbcontext.CitizenApplicationss
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
            .ToListAsync();

        int mailSentCount = 0;

        foreach (var application in applications)
        {
            var formDetailsObj = JToken.Parse(application.FormDetails ?? "{}");
            string applicantName = formDetailsObj["ApplicantName"]?.ToString() ?? "";
            string email = formDetailsObj["Email"]?.ToString() ?? "";

            var expiringApplication = await _dbcontext.ApplicationsWithExpiringEligibility
                .FirstOrDefaultAsync(ae => ae.ReferenceNumber == application.ReferenceNumber);

            if (expiringApplication != null && !string.IsNullOrEmpty(email))
            {
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
                await _dbcontext.SaveChangesAsync();

                await _emailSender.SendEmail(email, "UDID Card Expiry Notification", htmlMessage);
                mailSentCount++;
            }
        }

        _logger.LogInformation("Processed {Count} applications, sent {Mails} mails", applications.Count, mailSentCount);
    }

    // === Self-register all public async methods ===
    public async Task RegisterAllTasksAsync(string cronExpression = "0 9 * * *")
    {
        var methods = GetType()
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => m.ReturnType == typeof(Task));

        foreach (var method in methods)
        {
            string actionType = method.Name;

            // Register action
            await _scheduler.RegisterActionAsync(actionType, async ct =>
            {
                var parameters = method.GetParameters();
                object?[] args = parameters.Select(p =>
                {
                    if (p.ParameterType == typeof(string)) return "1"; // default ServiceId
                    if (p.ParameterType == typeof(CancellationToken)) return ct;
                    return Type.Missing;
                }).ToArray();

                await (Task)method.Invoke(this, args)!;
            });

            // Schedule it
            await _scheduler.ScheduleTaskAsync(cronExpression, actionType, async ct =>
            {
                var parameters = method.GetParameters();
                object?[] args = parameters.Select(p =>
                {
                    if (p.ParameterType == typeof(string)) return "1";
                    if (p.ParameterType == typeof(CancellationToken)) return ct;
                    return Type.Missing;
                }).ToArray();

                await (Task)method.Invoke(this, args)!;
            });

            _logger.LogInformation("✅ Registered and scheduled {MethodName} with CRON {Cron}", actionType, cronExpression);
        }
    }
}
