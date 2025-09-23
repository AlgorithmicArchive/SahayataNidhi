using Microsoft.EntityFrameworkCore;
using SahayataNidhi.Models.Entities;

public class SessionRepository
{
    private readonly SocialWelfareDepartmentContext _dbContext;

    public SessionRepository(SocialWelfareDepartmentContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserSession?> GetActiveSessionAsync(int userId)
    {
        var threshold = DateTime.UtcNow.AddMinutes(-30);
        return await _dbContext.UserSessions
            .Where(s => s.UserId == userId && s.LastActivityTime > threshold)
            .FirstOrDefaultAsync();
    }

    public async Task AddSessionAsync(UserSession session)
    {
        _dbContext.UserSessions.Add(session);
        await _dbContext.SaveChangesAsync();
    }

    public async Task RemoveSessionAsync(UserSession session)
    {
        _dbContext.UserSessions.Remove(session);
        await _dbContext.SaveChangesAsync();
    }

    public async Task UpdateLastActivityAsync(UserSession session)
    {
        session.LastActivityTime = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
    }
}
