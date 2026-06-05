using MediatR;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Dashboard.DTOs;
using QCModule.Application.Features.Dashboard.Queries.GetDashboardStats;
using QCModule.Application.Features.Dashboard.Queries.GetRecentActivities;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(IMediator mediator) : ControllerBase
{
    // Any authenticated user can view the dashboard (FallbackPolicy enforces auth).
    [HttpGet("statistics")]
    public async Task<ActionResult<Result<DashboardStatsDto>>> Statistics(CancellationToken ct)
        => Ok(await mediator.Send(new GetDashboardStatsQuery(), ct));

    [HttpGet("recent-activities")]
    public async Task<ActionResult<Result<IEnumerable<RecentActivityDto>>>> RecentActivities(
        [FromQuery] int limit = 10, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetRecentActivitiesQuery(limit), ct));
}
