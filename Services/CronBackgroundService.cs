using NCrontab;
using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using SahayataNidhi.Models.Entities;
using System.Reflection;

public interface ICronScheduler
{
    Task ScheduleTaskAsync(string cronExpression, string actionType, Func<CancellationToken, Task> action);
    Task<List<ScheduledJobs>> GetAllJobsAsync();
    Task UnscheduleTaskAsync(string taskId);
}

public class CronScheduler : BackgroundService, ICronScheduler
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CronScheduler> _logger;
    private readonly ConcurrentDictionary<string, (CrontabSchedule Schedule, string ActionType, Func<CancellationToken, Task> Action)> _scheduledTasks = new();
    private readonly ConcurrentDictionary<string, Func<CancellationToken, Task>> _actionRegistry = new();

    public CronScheduler(IServiceProvider serviceProvider, ILogger<CronScheduler> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task ScheduleTaskAsync(string cronExpression, string actionType, Func<CancellationToken, Task> action)
    {
        if (string.IsNullOrWhiteSpace(cronExpression)) throw new ArgumentNullException(nameof(cronExpression));
        if (string.IsNullOrWhiteSpace(actionType)) throw new ArgumentNullException(nameof(actionType));
        if (action == null) throw new ArgumentNullException(nameof(action));

        try
        {
            var schedule = CrontabSchedule.Parse(cronExpression, new CrontabSchedule.ParseOptions { IncludingSeconds = false });
            var taskId = Guid.NewGuid().ToString();

            _scheduledTasks[taskId] = (schedule, actionType, action);
            _actionRegistry[actionType] = action;

            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SwdjkContext>();
            db.ScheduledJobs.Add(new ScheduledJobs
            {
                Id = Guid.Parse(taskId),
                CronExpression = cronExpression,
                ActionType = actionType,
                LastExecutedAt = null
            });
            await db.SaveChangesAsync();

            _logger.LogInformation("Scheduled task {TaskId} ({ActionType}) with CRON: {Cron}", taskId, actionType, cronExpression);
        }
        catch (CrontabException ex)
        {
            _logger.LogError(ex, "Invalid cron expression: {CronExpression}", cronExpression);
            throw;
        }
    }

    public async Task<List<ScheduledJobs>> GetAllJobsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SwdjkContext>();
        return await db.ScheduledJobs.ToListAsync();
    }

    public async Task UnscheduleTaskAsync(string taskId)
    {
        if (_scheduledTasks.TryRemove(taskId, out var removed))
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SwdjkContext>();
            var job = await db.ScheduledJobs.FindAsync(Guid.Parse(taskId));
            if (job != null)
            {
                db.ScheduledJobs.Remove(job);
                await db.SaveChangesAsync();
            }
            _logger.LogInformation("Unscheduled task {TaskId} ({ActionType})", taskId, removed.ActionType);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Cron Scheduler starting...");
        await LoadPersistedJobsAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var tasksToRun = _scheduledTasks
                .Where(t => t.Value.Schedule.GetNextOccurrence(now) <= now)
                .ToList();

            foreach (var task in tasksToRun)
            {
                var (schedule, actionType, action) = task.Value;
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var registeredAction = _actionRegistry.GetValueOrDefault(actionType);
                        if (registeredAction == null)
                        {
                            registeredAction = await ResolveActionFromDIAsync(actionType, cts.Token);
                            if (registeredAction == null)
                            {
                                _logger.LogWarning("No action found for {ActionType}. Skipping.", actionType);
                                return;
                            }
                        }

                        await registeredAction(cts.Token);

                        // Update DB
                        using var scope = _serviceProvider.CreateScope();
                        var db = scope.ServiceProvider.GetRequiredService<SwdjkContext>();
                        var dbJob = await db.ScheduledJobs.FindAsync(Guid.Parse(task.Key), cts.Token);
                        if (dbJob != null)
                        {
                            dbJob.LastExecutedAt = DateTime.UtcNow;
                            await db.SaveChangesAsync(cts.Token);
                        }

                        _logger.LogInformation("Executed task {TaskId} ({ActionType})", task.Key, actionType);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to execute task {TaskId} ({ActionType})", task.Key, actionType);
                    }
                }, cts.Token);
            }

            // Sleep until next job
            var nextOccurrences = _scheduledTasks.Values
                .Select(t => t.Schedule.GetNextOccurrence(now))
                .Where(t => t > now)
                .ToList();

            var delay = nextOccurrences.Any()
                ? nextOccurrences.Min() - now
                : TimeSpan.FromSeconds(10);

            await Task.Delay(delay > TimeSpan.Zero ? delay : TimeSpan.FromMilliseconds(100), stoppingToken);
        }

        _logger.LogInformation("Cron Scheduler stopped.");
    }

    private async Task LoadPersistedJobsAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SwdjkContext>();
        var jobs = await db.ScheduledJobs.ToListAsync(ct);

        foreach (var job in jobs)
        {
            try
            {
                var schedule = CrontabSchedule.Parse(job.CronExpression, new CrontabSchedule.ParseOptions { IncludingSeconds = false });
                var action = _actionRegistry.GetValueOrDefault(job.ActionType) ?? (ct => Task.CompletedTask);

                _scheduledTasks[job.Id.ToString()] = (schedule, job.ActionType, action);
                _logger.LogInformation("Loaded job {JobId} ({ActionType})", job.Id, job.ActionType);
            }
            catch (CrontabException ex)
            {
                _logger.LogError(ex, "Invalid cron in DB for job {JobId}. Skipping.", job.Id);
            }
        }
    }

    private async Task<Func<CancellationToken, Task>?> ResolveActionFromDIAsync(string actionType, CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var cronServices = scope.ServiceProvider.GetService<CronServices>();
        if (cronServices == null) return null;

        var method = cronServices.GetType().GetMethod(actionType, BindingFlags.Public | BindingFlags.Instance);
        if (method?.ReturnType != typeof(Task)) return null;

        var action = async (CancellationToken token) =>
        {
            var parameters = method.GetParameters();
            var args = new object?[parameters.Length];
            for (int i = 0; i < parameters.Length; i++)
            {
                var p = parameters[i];
                if (p.ParameterType == typeof(string)) args[i] = "1";
                else if (p.ParameterType == typeof(CancellationToken)) args[i] = token;
                else args[i] = null;
            }
            await (Task)method.Invoke(cronServices, args)!;
        };

        _actionRegistry[actionType] = action;
        return action;
    }
}