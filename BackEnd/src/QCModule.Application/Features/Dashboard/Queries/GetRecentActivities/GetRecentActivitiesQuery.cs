using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Dashboard.DTOs;

namespace QCModule.Application.Features.Dashboard.Queries.GetRecentActivities;

public record GetRecentActivitiesQuery(int Limit = 10) : IRequest<Result<IEnumerable<RecentActivityDto>>>;
