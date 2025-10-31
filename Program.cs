using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SahayataNidhi.Models.Entities;
using SendEmails;
using System.Text;
using EncryptionHelper;
using Microsoft.AspNetCore.HttpOverrides;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);

// Bind to all interfaces
builder.WebHost.UseUrls("http://0.0.0.0:5004");

// Add services
builder.Services.AddControllersWithViews().AddRazorRuntimeCompilation();
builder.Services.AddSignalR();

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

builder.Services.AddDbContext<SwdjkContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys")))
    .SetApplicationName("ReactMvcApp");

builder.Services.AddControllers().AddNewtonsoftJson(options =>
    options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.Name = ".SahayataNidhi.Session";
});

// JWT
var jwtSecretKey = builder.Configuration.GetValue<string>("JWT:Secret");
var key = Encoding.ASCII.GetBytes(jwtSecretKey!);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JWT:Issuer"],
            ValidAudience = builder.Configuration["JWT:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("CitizenPolicy", p => p.RequireRole("Citizen"))
    .AddPolicy("OfficerPolicy", p => p.RequireRole("Officer"))
    .AddPolicy("AdminPolicy", p => p.RequireRole("Admin"))
    .AddPolicy("DesignerPolicy", p => p.RequireRole("Designer"))
    .AddPolicy("ViewerPolicy", p => p.RequireRole("Viewer"));

builder.Services.AddTransient<IEmailSender, EmailSender>();
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<OtpStore>();
builder.Services.AddScoped<EmailSender>();
builder.Services.AddScoped<UserHelperFunctions>();
builder.Services.AddTransient<PdfService>();
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddDetection();
builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
builder.Services.AddHostedService<QueuedHostedService>();

// CRON SCHEDULER (ONLY ONCE!)
builder.Services.AddSingleton<ICronScheduler, CronScheduler>();
builder.Services.AddHostedService<CronScheduler>(); // This registers ICronScheduler automatically
builder.Services.AddScoped<CronServices>();
builder.Services.AddScoped<SessionRepository>();
builder.Services.AddHttpClient();

var app = builder.Build();

// === ENSURE DB + CRON SETUP ON START ===
app.Lifetime.ApplicationStarted.Register(async () =>
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<SwdjkContext>();
    await db.Database.MigrateAsync(); // Critical!

    var cronService = scope.ServiceProvider.GetRequiredService<CronServices>();
    await cronService.RegisterAllTasksAsync("40 14 * * *"); // Daily at 2:40 PM
});

// Middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseDetection();
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.UseRouting();
app.UseCors("AllowAll");
app.UseSession();
app.UseAuthentication();
app.UseAuthorization();

app.MapHub<ProgressHub>("/progressHub");
app.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");
app.MapFallbackToController("Index", "Home");

// Optional: Health endpoint for cron jobs
app.MapGet("/cron/jobs", async (ICronScheduler scheduler) =>
{
    var jobs = await scheduler.GetAllJobsAsync();
    return Results.Ok(jobs.Select(j => new
    {
        j.Id,
        j.ActionType,
        j.CronExpression,
        LastRun = j.LastExecutedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "Never"
    }));
}).RequireAuthorization("AdminPolicy");

app.Run();