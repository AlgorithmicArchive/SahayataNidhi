using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace SahayataNidhi.Models.Entities;

public partial class SwdjkContext : DbContext
{
    public SwdjkContext(System.Data.Common.DbConnection dbConnection)
    {
    }

    public SwdjkContext(DbContextOptions<SwdjkContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActionHistory> ActionHistory { get; set; }

    public virtual DbSet<ApplicationPerDistrict> ApplicationPerDistrict { get; set; }

    public virtual DbSet<ApplicationsWithExpiringEligibility> ApplicationsWithExpiringEligibility { get; set; }

    public virtual DbSet<AuditLogs> AuditLogs { get; set; }

    public virtual DbSet<Bank> Bank { get; set; }

    public virtual DbSet<BankDetails> BankDetails { get; set; }

    public virtual DbSet<Blocks> Blocks { get; set; }

    public virtual DbSet<Certificates> Certificates { get; set; }

    public virtual DbSet<CitizenApplications> CitizenApplications { get; set; }

    public virtual DbSet<Corrigendum> Corrigendum { get; set; }

    public virtual DbSet<Departments> Departments { get; set; }

    public virtual DbSet<District> District { get; set; }

    public virtual DbSet<EmailSettings> EmailSettings { get; set; }

    public virtual DbSet<Feedback> Feedback { get; set; }

    public virtual DbSet<HalqaPanchayat> HalqaPanchayat { get; set; }

    public virtual DbSet<Muncipalities> Muncipalities { get; set; }

    public virtual DbSet<MuncipalityTypes> MuncipalityTypes { get; set; }

    public virtual DbSet<OfficersDesignations> OfficersDesignations { get; set; }

    public virtual DbSet<Offices> Offices { get; set; }

    public virtual DbSet<OfficesDetails> OfficesDetails { get; set; }

    public virtual DbSet<PensionPayments> PensionPayments { get; set; }

    public virtual DbSet<Pool> Pool { get; set; }

    public virtual DbSet<ScheduledJobs> ScheduledJobs { get; set; }

    public virtual DbSet<Services> Services { get; set; }

    public virtual DbSet<Tehsil> Tehsil { get; set; }

    public virtual DbSet<Tswotehsil> Tswotehsil { get; set; }

    public virtual DbSet<UserDocuments> UserDocuments { get; set; }

    public virtual DbSet<UserSessions> UserSessions { get; set; }

    public virtual DbSet<Users> Users { get; set; }

    public virtual DbSet<Villages> Villages { get; set; }

    public virtual DbSet<Wards> Wards { get; set; }

    public virtual DbSet<WebService> WebService { get; set; }

    public virtual DbSet<WithheldApplications> WithheldApplications { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer("Name=DefaultConnection");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ActionHistory>(entity =>
        {
            entity.HasKey(e => e.HistoryId).HasName("ActionHistory_PK");

            entity.Property(e => e.HistoryId).HasColumnName("history_id");
            entity.Property(e => e.ActionTaken)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.ActionTakenDate)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ActionTaker)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.LocationLevel)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.ReferenceNumber)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("referenceNumber");
            entity.Property(e => e.Remarks)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ApplicationPerDistrict>(entity =>
        {
            entity.HasKey(e => e.Uuid);

            entity.Property(e => e.Uuid).HasColumnName("UUID");
            entity.Property(e => e.FinancialYear)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Type).HasMaxLength(30);
        });

        modelBuilder.Entity<ApplicationsWithExpiringEligibility>(entity =>
        {
            entity.HasKey(e => e.ExpiringId);

            entity.Property(e => e.ExpiringId).HasColumnName("Expiring_Id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnName("Created_At");
            entity.Property(e => e.ExpirationDate)
                .HasMaxLength(100)
                .HasColumnName("Expiration_Date");
            entity.Property(e => e.MailSent).HasColumnName("Mail_Sent");
            entity.Property(e => e.ReferenceNumber).HasMaxLength(50);
        });

        modelBuilder.Entity<AuditLogs>(entity =>
        {
            entity.HasKey(e => e.LogId);

            entity.Property(e => e.Action).HasMaxLength(100);
            entity.Property(e => e.Browser).HasMaxLength(100);
            entity.Property(e => e.Device).HasMaxLength(100);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.OperatingSystem).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(20);
            entity.Property(e => e.Timestamp).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AuditLogs_Users");
        });

        modelBuilder.Entity<Bank>(entity =>
        {
            entity.ToTable("BANK");

            entity.Property(e => e.BankCode).HasMaxLength(5);
            entity.Property(e => e.BankName).HasMaxLength(255);
        });

        modelBuilder.Entity<BankDetails>(entity =>
        {
            entity.HasNoKey();

            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("ADDRESS");
            entity.Property(e => e.Bank)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("BANK");
            entity.Property(e => e.Branch)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("BRANCH");
            entity.Property(e => e.City1)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("CITY1");
            entity.Property(e => e.City2)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("CITY2");
            entity.Property(e => e.Ifsc)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("IFSC");
            entity.Property(e => e.Phone)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("PHONE");
            entity.Property(e => e.State)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("STATE");
            entity.Property(e => e.StdCode)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("STD CODE");
        });

        modelBuilder.Entity<Blocks>(entity =>
        {
            entity.HasKey(e => e.Uuid);

            entity.Property(e => e.Uuid).HasColumnName("UUID");
            entity.Property(e => e.BlockName)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Certificates>(entity =>
        {
            entity.HasKey(e => e.Uuid);

            entity.Property(e => e.Uuid).HasColumnName("UUID");
            entity.Property(e => e.CertifiyingAuthority)
                .IsUnicode(false)
                .HasColumnName("certifiyingAuthority");
            entity.Property(e => e.ExpirationDate)
                .HasColumnType("datetime")
                .HasColumnName("expirationDate");
            entity.Property(e => e.RegisteredDate)
                .HasMaxLength(50)
                .HasColumnName("registeredDate");
            entity.Property(e => e.SerialNumber).HasColumnName("serialNumber");
        });

        modelBuilder.Entity<CitizenApplications>(entity =>
        {
            entity.HasKey(e => e.ReferenceNumber);

            entity.ToTable("Citizen_Applications");

            entity.Property(e => e.ReferenceNumber)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CitizenId).HasColumnName("Citizen_id");
            entity.Property(e => e.CreatedAt)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("Created_at");
            entity.Property(e => e.DataType).HasMaxLength(20);
            entity.Property(e => e.DistrictUidForBank)
                .HasMaxLength(6)
                .IsUnicode(false);
            entity.Property(e => e.ReferenceNumberAlphaNumeric)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Corrigendum>(entity =>
        {
            entity.Property(e => e.CorrigendumId)
                .HasMaxLength(60)
                .IsUnicode(false);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.ReferenceNumber)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Type)
                .HasMaxLength(50)
                .HasColumnName("type");

            entity.HasOne(d => d.ReferenceNumberNavigation).WithMany(p => p.Corrigendum)
                .HasForeignKey(d => d.ReferenceNumber)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Corrigendum_Citizen_Applications");
        });

        modelBuilder.Entity<Departments>(entity =>
        {
            entity.HasKey(e => e.DepartmentId);
        });

        modelBuilder.Entity<District>(entity =>
        {
            entity.HasKey(e => e.DistrictId).HasName("District_PK");

            entity.Property(e => e.DistrictId)
                .ValueGeneratedNever()
                .HasColumnName("DistrictID");
            entity.Property(e => e.DistrictName)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.DistrictShort)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Uuid).HasColumnName("UUID");
        });

        modelBuilder.Entity<EmailSettings>(entity =>
        {
            entity.Property(e => e.Password).HasColumnType("text");
            entity.Property(e => e.SenderEmail)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.SenderName)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.SmtpServer)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.Property(e => e.CreatedOn)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Pending");
            entity.Property(e => e.Title).HasMaxLength(255);
            entity.Property(e => e.UserId).HasColumnName("userId");
        });

        modelBuilder.Entity<HalqaPanchayat>(entity =>
        {
            entity.HasNoKey();

            entity.Property(e => e.HalqaPanchayatName)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Uuid)
                .ValueGeneratedOnAdd()
                .HasColumnName("UUID");
        });

        modelBuilder.Entity<Muncipalities>(entity =>
        {
            entity.HasKey(e => e.Uuid);

            entity.Property(e => e.Uuid).HasColumnName("UUID");
            entity.Property(e => e.MuncipalityName)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<MuncipalityTypes>(entity =>
        {
            entity.HasKey(e => e.Uuid);

            entity.Property(e => e.Uuid).HasColumnName("UUID");
            entity.Property(e => e.TypeName)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<OfficersDesignations>(entity =>
        {
            entity.HasKey(e => e.Uuid).HasName("OfficersDesignations_PK");

            entity.Property(e => e.Uuid).HasColumnName("UUID");
            entity.Property(e => e.AccessLevel)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Designation).IsUnicode(false);
            entity.Property(e => e.DesignationShort)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Offices>(entity =>
        {
            entity.HasKey(e => e.OfficeId);

            entity.Property(e => e.AccessLevel).HasMaxLength(50);
            entity.Property(e => e.OfficeName).HasMaxLength(255);
            entity.Property(e => e.OfficeShort).HasMaxLength(50);
        });

        modelBuilder.Entity<OfficesDetails>(entity =>
        {
            entity.HasNoKey();

            entity.Property(e => e.AreaName).HasMaxLength(50);
            entity.Property(e => e.OfficeName).HasMaxLength(255);
        });

        modelBuilder.Entity<PensionPayments>(entity =>
        {
            entity.HasNoKey();

            entity.Property(e => e.BankResBankDateExecuted)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("bankRes_BankDateExecuted");
            entity.Property(e => e.BankResPensionerCategory)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("bankRes_pensionerCategory");
            entity.Property(e => e.BankResStatusFromBank)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("bankRes_StatusFromBank");
            entity.Property(e => e.BankResTransactionId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("bankRes_TransactionId");
            entity.Property(e => e.BankResTransactionStatus)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("bankRes_TransactionStatus");
            entity.Property(e => e.DistrictBankUid)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("districtBankUID");
            entity.Property(e => e.DistrictId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("districtId");
            entity.Property(e => e.DistrictName)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("districtName");
            entity.Property(e => e.DivisionCode)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("divisionCode");
            entity.Property(e => e.DivisionName)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("divisionName");
            entity.Property(e => e.PayingDepartment)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("payingDepartment");
            entity.Property(e => e.PayingDeptAccountNumber)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("payingDeptAccountNumber");
            entity.Property(e => e.PayingDeptBankName)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("payingDeptBankName");
            entity.Property(e => e.PayingDeptIfscCode)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("payingDeptIfscCode");
            entity.Property(e => e.PaymentFileGenerationDate)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("paymentFileGenerationDate");
            entity.Property(e => e.PaymentOfMonth)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("paymentOfMonth");
            entity.Property(e => e.PaymentOfYear)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("paymentOfYear");
            entity.Property(e => e.PensionAmount)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("pensionAmount");
            entity.Property(e => e.PensionerAccountNo)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("pensionerAccountNo");
            entity.Property(e => e.PensionerIfscCode)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("pensionerIfscCode");
            entity.Property(e => e.PensionerName)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("pensionerName");
            entity.Property(e => e.PensionerType)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("pensionerType");
            entity.Property(e => e.ReferenceNumber)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("referenceNumber");
            entity.Property(e => e.StateCode)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("stateCode");
            entity.Property(e => e.StateName)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("stateName");
        });

        modelBuilder.Entity<Pool>(entity =>
        {
            entity.HasIndex(e => e.ServiceId, "IX_Pool_ServiceId").HasFillFactor(100);

            entity.Property(e => e.AccessLevel)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.ListType)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.HasOne(d => d.Service).WithMany(p => p.Pool)
                .HasForeignKey(d => d.ServiceId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Pool_Services");
        });

        modelBuilder.Entity<ScheduledJobs>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Schedule__3214EC07F114B2BF");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.ActionType).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.CronExpression).HasMaxLength(100);
        });

        modelBuilder.Entity<Services>(entity =>
        {
            entity.HasKey(e => e.ServiceId);

            entity.Property(e => e.BankDetails).IsUnicode(false);
            entity.Property(e => e.CreatedAt)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.DocumentFields).HasDefaultValue("''''''");
            entity.Property(e => e.FormElement).IsUnicode(false);
            entity.Property(e => e.NameShort)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ServiceName)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.SubmissionLimitConfig).HasDefaultValue("{\"isLimited\": false, \"limitType\": \"\", \"limitCount\": 0}");
        });

        modelBuilder.Entity<Tehsil>(entity =>
        {
            entity.HasKey(e => new { e.TehsilId, e.Uuid }).HasName("Tehsil_PK");

            entity.Property(e => e.Uuid)
                .ValueGeneratedOnAdd()
                .HasColumnName("UUID");
            entity.Property(e => e.DistrictId).HasColumnName("DistrictID");
            entity.Property(e => e.IsTswo).HasDefaultValue(false);
            entity.Property(e => e.TehsilName)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Tswotehsil>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("TSWOTehsil");

            entity.Property(e => e.DistrictId).HasColumnName("DistrictID");
            entity.Property(e => e.DivisionCode).HasColumnName("divisionCode");
            entity.Property(e => e.TehsilName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TswoOfficeName)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("tswoOfficeName");
        });

        modelBuilder.Entity<UserDocuments>(entity =>
        {
            entity.HasKey(e => e.FileId);

            entity.Property(e => e.FileId).HasColumnName("fileId");
            entity.Property(e => e.DocumentType).HasMaxLength(50);
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.FileType).HasMaxLength(50);
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
        });

        modelBuilder.Entity<UserSessions>(entity =>
        {
            entity.HasKey(e => e.SessionId).HasName("PK__UserSess__C9F4929013FD5ADB");

            entity.Property(e => e.SessionId).ValueGeneratedNever();
            entity.Property(e => e.LastActivityTime)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.LoginTime)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
        });

        modelBuilder.Entity<Users>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.BackupCodes).IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.MobileNumber)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Password).HasMaxLength(64);
            entity.Property(e => e.Profile)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.RegisteredDate).HasMaxLength(120);
            entity.Property(e => e.UserType)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.Username)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Villages>(entity =>
        {
            entity.HasKey(e => e.Uuid);

            entity.Property(e => e.Uuid).HasColumnName("UUID");
            entity.Property(e => e.VillageName)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Wards>(entity =>
        {
            entity.HasKey(e => e.Uuid);

            entity.Property(e => e.Uuid).HasColumnName("UUID");
        });

        modelBuilder.Entity<WebService>(entity =>
        {
            entity.Property(e => e.ApiEndPoint).HasColumnName("apiEndPoint");
            entity.Property(e => e.CreatedAt)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("createdAt");
            entity.Property(e => e.FieldMappings).HasColumnName("fieldMappings");
            entity.Property(e => e.IsActive).HasColumnName("isActive");
            entity.Property(e => e.OnAction).HasColumnName("onAction");
            entity.Property(e => e.ServiceId).HasColumnName("serviceId");
            entity.Property(e => e.UpdatedAt)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("updatedAt");
            entity.Property(e => e.WebServiceName)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("webServiceName");

            entity.HasOne(d => d.Service).WithMany(p => p.WebService)
                .HasForeignKey(d => d.ServiceId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_WebService_Services");
        });

        modelBuilder.Entity<WithheldApplications>(entity =>
        {
            entity.HasKey(e => e.WithheldId);

            entity.ToTable("Withheld_Applications");

            entity.Property(e => e.WithheldId).HasColumnName("Withheld_Id");
            entity.Property(e => e.ReferenceNumber).HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.WithheldOn).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.WithheldReason).HasColumnType("text");
            entity.Property(e => e.WithheldType).HasMaxLength(20);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
