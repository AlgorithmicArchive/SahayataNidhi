using Microsoft.EntityFrameworkCore;
using SahayataNidhi.Models.Entities;

public class SessionRepository
{
    private readonly SwdjkContext _dbContext;
    private readonly ILogger<SessionRepository> _logger = LoggerFactory.Create(builder => builder.AddConsole()).CreateLogger<SessionRepository>();

    public SessionRepository(SwdjkContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserSessionss> GetActiveSessionAsync(int userId)
    {
        _logger.LogInformation($"=---------- Checking for active session for user ID: {userId} --------------------------");
        using var debugContext = new SwdjkContext(_dbContext.Database.GetDbConnection());
        var threshold = DateTime.UtcNow.AddMinutes(-30);
        return await _dbContext.UserSessionss
            .Where(s => s.UserId == userId && s.LastActivityTime > threshold)
            .FirstOrDefaultAsync();
    }

    public async Task AddSessionAsync(UserSessionss session)
    {
        _dbContext.UserSessionss.Add(session);
        await _dbContext.SaveChangesAsync();
    }

    public async Task RemoveSessionAsync(UserSessionss session)
    {
        _dbContext.UserSessionss.Remove(session);
        await _dbContext.SaveChangesAsync();
    }

    public async Task UpdateLastActivityAsync(UserSessionss session)
    {
        session.LastActivityTime = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
    }
}
