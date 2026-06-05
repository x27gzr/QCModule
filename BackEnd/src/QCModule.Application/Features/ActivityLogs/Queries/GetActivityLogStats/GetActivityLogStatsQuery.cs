using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.ActivityLogs.DTOs;

namespace QCModule.Application.Features.ActivityLogs.Queries.GetActivityLogStats;

public record GetActivityLogStatsQuery(
    DateTime? DateFrom = null,
    DateTime? DateTo   = null
) : IRequest<Result<ActivityLogStatsDto>>;
