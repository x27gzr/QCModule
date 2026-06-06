using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Settings;
using QCModule.Domain.Interfaces;
using QCModule.Infrastructure.Persistence;
using QCModule.Infrastructure.Persistence.Repositories;
using QCModule.Infrastructure.Services;

namespace QCModule.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(options =>
        {
            var s = configuration.GetSection("JwtSettings");
            options.SecretKey                    = s["SecretKey"]                       ?? string.Empty;
            options.Issuer                       = s["Issuer"]                          ?? string.Empty;
            options.Audience                     = s["Audience"]                        ?? string.Empty;
            options.AccessTokenExpirationMinutes = int.TryParse(s["AccessTokenExpirationMinutes"], out var m) ? m : 30;
            options.RefreshTokenExpirationDays   = int.TryParse(s["RefreshTokenExpirationDays"],   out var d) ? d : 7;
        });

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IWestgardService, WestgardService>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddHostedService<ResFileWatcherService>();

        return services;
    }
}
