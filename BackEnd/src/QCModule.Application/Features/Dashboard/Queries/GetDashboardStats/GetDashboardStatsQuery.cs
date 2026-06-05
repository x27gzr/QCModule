using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Dashboard.DTOs;

namespace QCModule.Application.Features.Dashboard.Queries.GetDashboardStats;

public record GetDashboardStatsQuery : IRequest<Result<DashboardStatsDto>>;
