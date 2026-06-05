using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.ActivityLogs.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.ActivityLogs.Queries.GetActivityLogs;

public class GetActivityLogsQueryHandler(
    IRepository<ActivityLog> logRepo,
    IRepository<User>        userRepo)
    : IRequestHandler<GetActivityLogsQuery, Result<PaginatedResult<ActivityLogDto>>>
{
    public async Task<Result<PaginatedResult<ActivityLogDto>>> Handle(GetActivityLogsQuery request, CancellationToken cancellationToken)
    {
        var logs    = await logRepo.GetAllAsync(cancellationToken);
        var users   = await userRepo.GetAllAsync(cancellationToken);
        var userMap = users.ToDictionary(u => u.Id, u => u.Name);

        var query = logs.AsEnumerable();

        if (request.UserId.HasValue)                  query = query.Where(l => l.UserId == request.UserId.Value);
        if (!string.IsNullOrWhiteSpace(request.Action)) query = query.Where(l => l.Action == request.Action);
        if (!string.IsNullOrWhiteSpace(request.Module)) query = query.Where(l => l.EntityType == request.Module);
        if (request.DateFrom.HasValue)                query = query.Where(l => l.CreatedAt >= request.DateFrom.Value);
        if (request.DateTo.HasValue)                  query = query.Where(l => l.CreatedAt <= request.DateTo.Value);

        var ordered  = query.OrderByDescending(l => l.CreatedAt).ToList();
        var total    = ordered.Count;
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var page     = Math.Max(request.Page, 1);

        var items = ordered
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(l => new ActivityLogDto(
                l.Id, l.UserId,
                l.UserId.HasValue ? userMap.GetValueOrDefault(l.UserId.Value, "Unknown") : "System",
                l.Action, l.EntityType, l.EntityId, l.Description, l.IpAddress, l.CreatedAt))
            .ToList();

        return Result<PaginatedResult<ActivityLogDto>>.Success(new PaginatedResult<ActivityLogDto>
        {
            Items = items, TotalCount = total, PageNumber = page, PageSize = pageSize
        });
    }
}
