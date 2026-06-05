using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.ActivityLogs.DTOs;
using QCModule.Application.Features.ActivityLogs.Queries.GetActivityLogs;
using QCModule.Application.Features.ActivityLogs.Queries.GetActivityLogStats;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/activity-logs")]
[Authorize(Policy = Permissions.ActivityLogs.View)]
public class ActivityLogsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<Result<PaginatedResult<ActivityLogDto>>>> GetAll(
        [FromQuery] Guid?     userId,
        [FromQuery] string?   action,
        [FromQuery] string?   module,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int       page     = 1,
        [FromQuery] int       pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetActivityLogsQuery(userId, action, module, dateFrom, dateTo, page, pageSize), ct));

    [HttpGet("statistics")]
    public async Task<ActionResult<Result<ActivityLogStatsDto>>> Statistics(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetActivityLogStatsQuery(dateFrom, dateTo), ct));
}
