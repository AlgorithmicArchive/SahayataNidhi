using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using NCrontab;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SahayataNidhi.Models.Entities;

public interface ICronScheduler
{
    Task ScheduleTaskAsync(string cronExpression, string actionType, Func<CancellationToken, Task> action);
}

public class CronScheduler : BackgroundService, ICronScheduler
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CronScheduler> _logger;
    private readonly ConcurrentDictionary<string, (CrontabSchedule Schedule, string ActionType, Func<CancellationToken, Task> Action)> _scheduledTasks;
    private readonly Dictionary<string, Func<CancellationToken, Task>> _actionRegistry;

    public CronScheduler(IServiceProvider serviceProvider, ILogger<CronScheduler> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _scheduledTasks = new ConcurrentDictionary<string, (CrontabSchedule, string, Func<CancellationToken, Task>)>();

        // Define known action types and their corresponding actions
        _actionRegistry = new Dictionary<string, Func<CancellationToken, Task>>
        {
            // Example actions; replace with your actual job logic
            { "SendEmail", async (ct) =>
                {
                    using var scope = _serviceProvider.CreateScope();
                    // Example: Resolve email service and send email
                    _logger.LogInformation("Executing SendEmail job");
                    await Task.CompletedTask; // Replace with actual logic
                } },
            { "ProcessData", async (ct) =>
                {
                    using var scope = _serviceProvider.CreateScope();
                    // Example: Resolve data processing service
                    _logger.LogInformation("Executing ProcessData job");
                    await Task.CompletedTask; // Replace with actual logic
                } }
            // Add more action types as needed
        };
    }

    public async Task ScheduleTaskAsync(string cronExpression, string actionType, Func<CancellationToken, Task> action)
    {
        if (string.IsNullOrWhiteSpace(cronExpression))
            throw new ArgumentNullException(nameof(cronExpression));
        if (string.IsNullOrWhiteSpace(actionType))
            throw new ArgumentNullException(nameof(actionType));
        if (action == null)
            throw new ArgumentNullException(nameof(action));

        try
        {
            var schedule = CrontabSchedule.Parse(cronExpression);
            var taskId = Guid.NewGuid().ToString();

            _scheduledTasks.TryAdd(taskId, (schedule, actionType, action));

            // Persist to DB
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SocialWelfareDepartmentContext>();

            db.ScheduledJobs.Add(new ScheduledJob
            {
                Id = Guid.Parse(taskId),
                CronExpression = cronExpression,
                ActionType = actionType
            });

            await db.SaveChangesAsync();

            _logger.LogInformation($"✅ Scheduled and persisted task {taskId} ({actionType}) with CRON: {cronExpression}");
        }
        catch (CrontabException ex)
        {
            _logger.LogError(ex, "Invalid cron expression: {CronExpression}", cronExpression);
            throw;
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 Cron Scheduler starting...");

        await LoadPersistedJobsAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;

            foreach (var task in _scheduledTasks)
            {
                var (schedule, actionType, action) = task.Value;
                var nextOccurrence = schedule.GetNextOccurrence(now);

                if (nextOccurrence <= now)
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await action(stoppingToken);

                            // Update last executed time
                            using var scope = _serviceProvider.CreateScope();
                            var db = scope.ServiceProvider.GetRequiredService<SocialWelfareDepartmentContext>();
                            var dbJob = await db.ScheduledJobs.FindAsync(Guid.Parse(task.Key));
                            if (dbJob != null)
                            {
                                dbJob.LastExecutedAt = DateTime.UtcNow;
                                await db.SaveChangesAsync();
                            }

                            _logger.LogInformation($"✅ Executed task {task.Key} ({actionType}) at {DateTime.UtcNow}");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"❌ Failed to execute task {task.Key} ({actionType})");
                        }
                    });
                }
            }

            // Calculate delay until next execution
            var nextOccurrences = _scheduledTasks.Values
                .Select(t => t.Schedule.GetNextOccurrence(now))
                .ToList();

            var minNextOccurrence = nextOccurrences.Any() ? nextOccurrences.Min() : DateTime.MaxValue;
            var delay = minNextOccurrence == DateTime.MaxValue ? TimeSpan.FromSeconds(10) : minNextOccurrence - now;

            await Task.Delay(delay > TimeSpan.Zero ? delay : TimeSpan.FromMilliseconds(100), stoppingToken);
        }

        _logger.LogInformation("🛑 Cron Scheduler stopping.");
    }

    private async Task LoadPersistedJobsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SocialWelfareDepartmentContext>();
        var persistedJobs = await db.ScheduledJobs.ToListAsync(cancellationToken);

        foreach (var job in persistedJobs)
        {
            try
            {
                var schedule = CrontabSchedule.Parse(job.CronExpression);

                // Resolve the action based on ActionType
                if (!_actionRegistry.TryGetValue(job.ActionType, out var action))
                {
                    _logger.LogWarning($"⚠️ No action registered for ActionType {job.ActionType}. Using no-op action for job {job.Id}.");
                    action = ct => Task.CompletedTask; // Fallback to no-op action
                }

                _scheduledTasks.TryAdd(job.Id.ToString(), (schedule, job.ActionType, action));

                _logger.LogInformation($"🔄 Loaded and registered job {job.Id} ({job.ActionType}) with CRON {job.CronExpression}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to load persisted job {JobId}", job.Id);
            }
        }
    }
}