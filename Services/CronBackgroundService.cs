using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using NCrontab;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SahayataNidhi.Models.Entities;

public interface ICronScheduler
{
    Task ScheduleTaskAsync(string cronExpression, string actionType, Func<CancellationToken, Task> action);
    Task RegisterActionAsync(string actionType, Func<CancellationToken, Task> action); // New: Dynamic action registration
    Task<List<ScheduledJob>> GetAllJobsAsync(); // New: For monitoring
    Task UnscheduleTaskAsync(string taskId); // New: For dynamic removal
}

public class CronScheduler(IServiceProvider serviceProvider, ILogger<CronScheduler> logger) : BackgroundService, ICronScheduler
{
    private readonly IServiceProvider _serviceProvider = serviceProvider;
    private readonly ILogger<CronScheduler> _logger = logger;
    private readonly ConcurrentDictionary<string, (CrontabSchedule Schedule, string ActionType, Func<CancellationToken, Task> Action)> _scheduledTasks = new ConcurrentDictionary<string, (CrontabSchedule, string, Func<CancellationToken, Task>)>();
    private readonly ConcurrentDictionary<string, Func<CancellationToken, Task>> _actionRegistry = new ConcurrentDictionary<string, Func<CancellationToken, Task>>(); // Changed to ConcurrentDictionary for thread-safety

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

            // Store the action directly for dynamism
            _scheduledTasks.TryAdd(taskId, (schedule, actionType, action));

            // Persist to DB (action is not persisted; resolved via registry for loaded jobs)
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SocialWelfareDepartmentContext>();

            db.ScheduledJobs.Add(new ScheduledJob
            {
                Id = Guid.Parse(taskId),
                CronExpression = cronExpression,
                ActionType = actionType,
                LastExecutedAt = null // Will be updated on execution
            });

            await db.SaveChangesAsync();

            // Optionally register the action if it's new (for future loads)
            _actionRegistry.TryAdd(actionType, action);

            _logger.LogInformation($"✅ Dynamically scheduled task {taskId} ({actionType}) with CRON: {cronExpression}");
        }
        catch (CrontabException ex)
        {
            _logger.LogError(ex, "Invalid cron expression: {CronExpression}", cronExpression);
            throw;
        }
    }

    public Task RegisterActionAsync(string actionType, Func<CancellationToken, Task> action)
    {
        if (string.IsNullOrWhiteSpace(actionType))
            throw new ArgumentNullException(nameof(actionType));
        ArgumentNullException.ThrowIfNull(action);

        _actionRegistry.TryAdd(actionType, action);
        _logger.LogInformation($"✅ Registered dynamic action: {actionType}");
        return Task.CompletedTask;
    }

    public async Task<List<ScheduledJob>> GetAllJobsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SocialWelfareDepartmentContext>();
        return await db.ScheduledJobs.ToListAsync();
    }

    public async Task UnscheduleTaskAsync(string taskId)
    {
        if (_scheduledTasks.TryRemove(taskId, out _))
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SocialWelfareDepartmentContext>();
            var job = await db.ScheduledJobs.FindAsync(Guid.Parse(taskId));
            if (job != null)
            {
                db.ScheduledJobs.Remove(job);
                await db.SaveChangesAsync();
            }
            _logger.LogInformation($"✅ Unscheduled task {taskId}");
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

                            // Update last executed time in DB
                            using var scope = _serviceProvider.CreateScope();
                            var db = scope.ServiceProvider.GetRequiredService<SocialWelfareDepartmentContext>();
                            var dbJob = await db.ScheduledJobs.FindAsync(Guid.Parse(task.Key));
                            if (dbJob != null)
                            {
                                dbJob.LastExecutedAt = DateTime.UtcNow;
                                await db.SaveChangesAsync();
                            }

                            _logger.LogInformation($"✅ Executed dynamic task {task.Key} ({actionType}) at {DateTime.UtcNow}");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"❌ Failed to execute dynamic task {task.Key} ({actionType})");
                        }
                    }, stoppingToken);
                }
            }

            // Sleep logic remains the same
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

                // Dynamically resolve action from registry
                if (!_actionRegistry.TryGetValue(job.ActionType, out var action))
                {
                    _logger.LogWarning($"⚠️ No action registered for dynamic ActionType {job.ActionType}. Using no-op for job {job.Id}.");
                    action = ct => Task.CompletedTask; // Fallback
                }

                _scheduledTasks.TryAdd(job.Id.ToString(), (schedule, job.ActionType, action));

                _logger.LogInformation($"🔄 Loaded dynamic job {job.Id} ({job.ActionType}) with CRON {job.CronExpression}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to load persisted dynamic job {JobId}", job.Id);
            }
        }
    }
}