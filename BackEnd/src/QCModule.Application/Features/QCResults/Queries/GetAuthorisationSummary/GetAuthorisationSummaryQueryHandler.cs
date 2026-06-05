using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Queries.GetAuthorisationSummary;

public class GetAuthorisationSummaryQueryHandler(
    IRepository<QCResult>          resultRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<User>              userRepo)
    : IRequestHandler<GetAuthorisationSummaryQuery, Result<AuthorisationSummaryDto>>
{
    public async Task<Result<AuthorisationSummaryDto>> Handle(
        GetAuthorisationSummaryQuery request, CancellationToken cancellationToken)
    {
        var all = await resultRepo.GetAllAsync(cancellationToken);

        // Only results that passed analyst validation count toward doctor authorisation.
        var scope = all.Where(r => r.ValidationStatus == ValidationStatus.Validated);
        if (request.DateFrom.HasValue) scope = scope.Where(r => r.ResultDate >= request.DateFrom.Value);
        if (request.DateTo.HasValue)   scope = scope.Where(r => r.ResultDate <= request.DateTo.Value);

        var list       = scope.ToList();
        var total      = list.Count;
        var authorised = list.Count(r => r.AuthorisationStatus == AuthorisationStatus.Authorised);
        var pending    = list.Count(r => r.AuthorisationStatus == AuthorisationStatus.Pending);
        var percentage = total > 0 ? Math.Round((double)authorised / total * 100, 1) : 0;

        var last = list
            .Where(r => r.AuthorisationStatus == AuthorisationStatus.Authorised && r.AuthorisedAt.HasValue)
            .OrderByDescending(r => r.AuthorisedAt)
            .FirstOrDefault();

        string?   lastName  = null;
        string?   lastParam = null;
        DateTime? lastAt    = null;

        if (last is not null)
        {
            lastAt = last.AuthorisedAt;
            if (last.AuthorisedBy.HasValue)
            {
                var users = await userRepo.FindAsync(u => u.Id == last.AuthorisedBy.Value, cancellationToken);
                lastName = users.FirstOrDefault()?.Name;
            }
            var params_ = await paramRepo.FindAsync(p => p.Id == last.TestFileParameterId, cancellationToken);
            lastParam = params_.FirstOrDefault()?.ParameterName;
        }

        return Result<AuthorisationSummaryDto>.Success(new AuthorisationSummaryDto(
            total, authorised, pending, percentage, lastName, lastAt, lastParam));
    }
}
