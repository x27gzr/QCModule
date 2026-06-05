using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.ActivityLogs.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.ActivityLogs.Queries.GetActivityLogStats;

public class GetActivityLogStatsQueryHandler(
    IRepository<ActivityLog> logRepo,
    IRepository<User>        userRepo)
    : IRequestHandler<GetActivityLogStatsQuery, Result<ActivityLogStatsDto>>
{
    public async Task<Result<ActivityLogStatsDto>> Handle(GetActivityLogStatsQuery request, CancellationToken cancellationToken)
    {
        // Default range: current month
        var from = request.DateFrom ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var to   = request.DateTo   ?? DateTime.UtcNow;

        var logs    = await logRepo.GetAllAsync(cancellationToken);
        var users   = await userRepo.GetAllAsync(cancellationToken);
        var userMap = users.ToDictionary(u => u.Id, u => u.Name);

        var scoped = logs.Where(l => l.CreatedAt >= from && l.CreatedAt <= to).ToList();

        var byAction = scoped.GroupBy(l => l.Action)
            .Select(g => new CountByKeyDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count).ToList();

        var byModule = scoped.GroupBy(l => l.EntityType)
            .Select(g => new CountByKeyDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count).ToList();

        var byUser = scoped.GroupBy(l => l.UserId)
            .Select(g => new CountByKeyDto(
                g.Key.HasValue ? userMap.GetValueOrDefault(g.Key.Value, "Unknown") : "System",
                g.Count()))
            .OrderByDescending(x => x.Count).ToList();

        return Result<ActivityLogStatsDto>.Success(
            new ActivityLogStatsDto(scoped.Count, byAction, byModule, byUser));
    }
}
