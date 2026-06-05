using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Dashboard.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Dashboard.Queries.GetDashboardStats;

public class GetDashboardStatsQueryHandler(IRepository<QCResult> resultRepo)
    : IRequestHandler<GetDashboardStatsQuery, Result<DashboardStatsDto>>
{
    public async Task<Result<DashboardStatsDto>> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
    {
        var all = (await resultRepo.GetAllAsync(cancellationToken)).ToList();

        var todayUtc      = DateTime.UtcNow.Date;
        var sevenDaysAgo  = todayUtc.AddDays(-7);

        var pendingValidation = all.Count(r => r.ValidationStatus == ValidationStatus.Pending);

        var pendingAuthorise = all.Count(r =>
            r.ValidationStatus == ValidationStatus.Validated &&
            r.AuthorisationStatus == AuthorisationStatus.Pending);

        var authorisedToday = all.Count(r =>
            r.AuthorisationStatus == AuthorisationStatus.Authorised &&
            r.AuthorisedAt.HasValue && r.AuthorisedAt.Value.Date == todayUtc);

        var westgardViolations = all.Count(r =>
            !string.IsNullOrWhiteSpace(r.WestgardFlags) &&
            r.ResultDate.Date >= sevenDaysAgo);

        return Result<DashboardStatsDto>.Success(
            new DashboardStatsDto(pendingValidation, pendingAuthorise, authorisedToday, westgardViolations));
    }
}
