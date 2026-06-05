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
                });
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
