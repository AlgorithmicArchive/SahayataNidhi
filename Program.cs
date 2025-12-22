using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.HttpOverrides;
using SahayataNidhi.Models.Entities;
using SendEmails;
using Microsoft.AspNetCore.DataProtection;
using System.Security.Claims;
using EncryptionHelper;

var builder = WebApplication.CreateBuilder(args);

// Bind to all network interfaces
builder.WebHost.UseUrls("http://0.0.0.0:5004");

// Add services
builder.Services.AddControllersWithViews().AddRazorRuntimeCompilation();
builder.Services.AddSignalR();
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

builder.Services.AddDbContext<SwdjkContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys")))
    .SetApplicationName("ReactMvcApp");

builder.Services.AddControllers().AddNewtonsoftJson(options =>
{
    options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.Name = ".SahayataNidhi.Session";
});


// JWT Authentication
var jwtSecretKey = builder.Configuration.GetValue<string>("JWT:Secret");
var key = Encoding.ASCII.GetBytes(jwtSecretKey!);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
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

    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = context =>
        {
            var claimsIdentity = context.Principal!.Identity as ClaimsIdentity;
            if (claimsIdentity != null)
            {
                var username = claimsIdentity.FindFirst(ClaimTypes.Name)?.Value;
                Console.WriteLine($"JWT Token validated for user: {username}");
            }
            return Task.CompletedTask;
        },
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"Authentication failed: {context.Exception.Message}");
            return Task.CompletedTask;
        }
    };
});

// Authorization policies
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("CitizenPolicy", policy => policy.RequireRole("Citizen"))
    .AddPolicy("OfficerPolicy", policy => policy.RequireRole("Officer"))
    .AddPolicy("AdminPolicy", policy => policy.RequireRole("Admin"))
    .AddPolicy("DesignerPolicy", policy => policy.RequireRole("Designer"))
    .AddPolicy("ViewerPolicy", policy => policy.RequireRole("Viewer"));

builder.Services.AddTransient<IEmailSender, EmailSender>();
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<OtpStore>();
builder.Services.AddScoped<EmailSender>();
builder.Services.AddScoped<UserHelperFunctions>();
builder.Services.AddTransient<PdfService>();
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddCors();
builder.Services.AddDetection();

builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
builder.Services.AddHostedService<QueuedHostedService>();
builder.Services.AddSingleton<ICronScheduler, CronScheduler>();
builder.Services.AddHostedService<CronScheduler>();
builder.Services.AddScoped<SessionRepository>();
builder.Services.AddScoped<CronServices>();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();

var app = builder.Build();


app.Lifetime.ApplicationStarted.Register(async () =>
{
    using var scope = app.Services.CreateScope();
    var cronService = scope.ServiceProvider.GetRequiredService<CronServices>();

    // Automatically registers NotifyExpiringEligibilities
    await cronService.RegisterAllTasksAsync("40 14 * * *"); // daily at 12 AM
});


// HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        var fileExtension = Path.GetExtension(ctx.File.Name).ToLower();
        if (fileExtension == ".pdf")
            ctx.Context.Response.Headers.Append("Content-Disposition", "inline");
        else if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg" }.Contains(fileExtension))
            ctx.Context.Response.Headers.Append("Content-Type", $"image/{fileExtension.TrimStart('.')}");
    }
});



app.UseDetection();

// ⚡ Add this for Nginx + ngrok forwarded headers
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

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapFallbackToController("Index", "Home");

app.Run();

