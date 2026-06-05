using Microsoft.EntityFrameworkCore;
using QCModule.Domain.Entities;

namespace QCModule.Infrastructure.Persistence;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<Role>              Roles              => Set<Role>();
    public DbSet<RefreshToken>      RefreshTokens      => Set<RefreshToken>();
    public DbSet<User>              Users              => Set<User>();
    public DbSet<Instrument>        Instruments        => Set<Instrument>();
    public DbSet<QCSample>          QCSamples          => Set<QCSample>();
    public DbSet<QCSampleTarget>    QCSampleTargets    => Set<QCSampleTarget>();
    public DbSet<TestFile>          TestFiles          => Set<TestFile>();
    public DbSet<TestFileParameter> TestFileParameters => Set<TestFileParameter>();
    public DbSet<QCResult>          QCResults          => Set<QCResult>();
    public DbSet<WestgardRule>      WestgardRules      => Set<WestgardRule>();
    public DbSet<ActivityLog>       ActivityLogs       => Set<ActivityLog>();
    public DbSet<AppSetting>        AppSettings        => Set<AppSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // ── Soft-delete global filters ────────────────────────────────────────
        modelBuilder.Entity<Role>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Instrument>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<QCSample>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<QCResult>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<QCSampleTarget>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<TestFile>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<TestFileParameter>().HasQueryFilter(e => !e.IsDeleted);

        // ── User ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
        });

        // ── RefreshToken ──────────────────────────────────────────────────────
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(rt => rt.Id);
            e.HasIndex(rt => rt.Token).IsUnique();

            e.HasOne(rt => rt.User)
             .WithMany()
             .HasForeignKey(rt => rt.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── AppSettings (login customization) ─────────────────────────────────
        modelBuilder.Entity<AppSetting>(e =>
        {
            e.HasIndex(s => s.Key).IsUnique();

            AppSetting Seed(string guid, string key, string? value) => new()
            {
                Id = Guid.Parse(guid), Key = key, Value = value,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), IsDeleted = false
            };

            e.HasData(
                Seed("b1000001-0000-0000-0000-000000000001", "login_background_preset", "gradient-blue"),
                Seed("b1000001-0000-0000-0000-000000000002", "login_circle_color",      "blue"),
                Seed("b1000001-0000-0000-0000-000000000003", "login_show_circle",        "true"),
                Seed("b1000001-0000-0000-0000-000000000004", "login_logo_size",          "medium"),
                Seed("b1000001-0000-0000-0000-000000000005", "app_title",                "QC Module"),
                Seed("b1000001-0000-0000-0000-000000000006", "app_subtitle",             "Laboratory Quality Control")
            );
        });

        // ── WestgardRules seed ────────────────────────────────────────────────
        modelBuilder.Entity<WestgardRule>().HasData(
            new WestgardRule { Id = Guid.Parse("a1000001-0000-0000-0000-000000000001"), RuleCode = "1:2s", Description = "Warning: one value exceeds ±2SD. Investigate but do not reject.",   IsWarning = true,  IsRejection = false, IsEnabled = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), IsDeleted = false },
            new WestgardRule { Id = Guid.Parse("a1000001-0000-0000-0000-000000000002"), RuleCode = "1:3s", Description = "Rejection: one value exceeds ±3SD. Random error.",                  IsWarning = false, IsRejection = true,  IsEnabled = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), IsDeleted = false },
            new WestgardRule { Id = Guid.Parse("a1000001-0000-0000-0000-000000000003"), RuleCode = "2:2s", Description = "Rejection: two consecutive values exceed the same ±2SD limit.",     IsWarning = false, IsRejection = true,  IsEnabled = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), IsDeleted = false },
            new WestgardRule { Id = Guid.Parse("a1000001-0000-0000-0000-000000000004"), RuleCode = "R:4s", Description = "Rejection: range between two values in a run exceeds 4SD.",         IsWarning = false, IsRejection = true,  IsEnabled = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), IsDeleted = false },
            new WestgardRule { Id = Guid.Parse("a1000001-0000-0000-0000-000000000005"), RuleCode = "4:1s", Description = "Rejection: four consecutive values exceed the same ±1SD limit.",    IsWarning = false, IsRejection = true,  IsEnabled = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), IsDeleted = false },
            new WestgardRule { Id = Guid.Parse("a1000001-0000-0000-0000-000000000006"), RuleCode = "10:x", Description = "Rejection: ten consecutive values fall on the same side of mean.", IsWarning = false, IsRejection = true,  IsEnabled = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), IsDeleted = false }
        );

        // ── Role ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<Role>(e =>
        {
            e.HasIndex(r => r.Name).IsUnique();

            e.HasMany(r => r.Users)
             .WithOne(u => u.Role)
             .HasForeignKey(u => u.RoleId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasData(
                new Role
                {
                    Id          = Guid.Parse("3d490a70-94ce-4d15-9494-5248280c2ce3"),
                    Name        = "Admin",
                    Description = "Full system access. Manages users, instruments, and all QC data.",
                    IsSystem    = true,
                    CreatedAt   = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    IsDeleted   = false
                },
                new Role
                {
                    Id          = Guid.Parse("6313179f-7837-473a-a4d5-a1571ff9e65e"),
                    Name        = "Supervisor",
                    Description = "Reviews and approves QC results. Manages QC samples.",
                    IsSystem    = true,
                    CreatedAt   = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    IsDeleted   = false
                },
                new Role
                {
                    Id          = Guid.Parse("b2b7d1f5-3f42-44e7-bbd5-8e04cdcf7ef7"),
                    Name        = "Analyst",
                    Description = "Inputs QC results and views reports.",
                    IsSystem    = true,
                    CreatedAt   = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    IsDeleted   = false
                },
                new Role
                {
                    Id          = Guid.Parse("c4c8e2a9-1d6b-4f3e-9a7c-2b5d8e0f1a3c"),
                    Name        = "Doctor",
                    Description = "Authorises validated QC results (second approval layer).",
                    IsSystem    = true,
                    CreatedAt   = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    IsDeleted   = false
                });
        });

        // ── QCResult approval relationships (3 FKs to User) ───────────────────
        modelBuilder.Entity<QCResult>(e =>
        {
            // Entry author — keep the existing User.QCResults inverse collection
            e.HasOne(r => r.User)
             .WithMany(u => u.QCResults)
             .HasForeignKey(r => r.UserId)
             .OnDelete(DeleteBehavior.Restrict);

            // Analyst validator (no inverse collection)
            e.HasOne(r => r.ValidatedByUser)
             .WithMany()
             .HasForeignKey(r => r.ValidatedBy)
             .OnDelete(DeleteBehavior.NoAction);

            // Doctor authoriser (no inverse collection)
            e.HasOne(r => r.AuthorisedByUser)
             .WithMany()
             .HasForeignKey(r => r.AuthorisedBy)
             .OnDelete(DeleteBehavior.NoAction);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
