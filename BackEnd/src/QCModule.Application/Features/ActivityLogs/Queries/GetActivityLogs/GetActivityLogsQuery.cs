using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.ActivityLogs.DTOs;

namespace QCModule.Application.Features.ActivityLogs.Queries.GetActivityLogs;

public record GetActivityLogsQuery(
    Guid?     UserId   = null,
    string?   Action   = null,
    string?   Module   = null,
    DateTime? DateFrom = null,
    DateTime? DateTo   = null,
    int       Page     = 1,
    int       PageSize = 20
) : IRequest<Result<PaginatedResult<ActivityLogDto>>>;
