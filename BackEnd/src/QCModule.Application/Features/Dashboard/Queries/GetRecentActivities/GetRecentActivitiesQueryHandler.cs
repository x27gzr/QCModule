using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Dashboard.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Dashboard.Queries.GetRecentActivities;

public class GetRecentActivitiesQueryHandler(
    IRepository<QCResult>          resultRepo,
    IRepository<QCSample>          sampleRepo,
    IRepository<Instrument>        instrumentRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<User>              userRepo)
    : IRequestHandler<GetRecentActivitiesQuery, Result<IEnumerable<RecentActivityDto>>>
{
    public async Task<Result<IEnumerable<RecentActivityDto>>> Handle(GetRecentActivitiesQuery request, CancellationToken cancellationToken)
    {
        var results     = await resultRepo.GetAllAsync(cancellationToken);
        var samples     = await sampleRepo.GetAllAsync(cancellationToken);
        var instruments = await instrumentRepo.GetAllAsync(cancellationToken);
        var params_     = await paramRepo.GetAllAsync(cancellationToken);
        var users       = await userRepo.GetAllAsync(cancellationToken);

        var sampleMap = samples.ToDictionary(s => s.Id);
        var instrMap  = instruments.ToDictionary(i => i.Id, i => i.Name);
        var paramMap  = params_.ToDictionary(p => p.Id, p => p.ParameterName);
        // Prefer the short nickname for activity display, fall back to full name.
        var userMap   = users.ToDictionary(u => u.Id, u => string.IsNullOrWhiteSpace(u.Nickname) ? u.Name : u.Nickname!);

        var limit = Math.Clamp(request.Limit, 1, 50);

        var recent = results
            .OrderByDescending(r => r.UpdatedAt ?? r.CreatedAt)
            .Take(limit)
            .Select(r =>
            {
                // Latest activity determines the action shown
                string   action;
                string   userName;
                DateTime activityTime;

                if (r.AuthorisationStatus == AuthorisationStatus.Authorised && r.AuthorisedBy.HasValue)
                {
                    action       = "Authorised";
                    userName     = userMap.GetValueOrDefault(r.AuthorisedBy.Value, "Unknown");
                    activityTime = r.AuthorisedAt ?? r.UpdatedAt ?? r.CreatedAt;
                }
                else if (r.ValidationStatus == ValidationStatus.Validated && r.ValidatedBy.HasValue)
                {
                    action       = "Validated";
                    userName     = userMap.GetValueOrDefault(r.ValidatedBy.Value, "Unknown");
                    activityTime = r.ValidatedAt ?? r.UpdatedAt ?? r.CreatedAt;
                }
                else
                {
                    action       = "Entered";
                    userName     = r.UserId.HasValue ? userMap.GetValueOrDefault(r.UserId.Value, "Unknown") : "Auto Import";
                    activityTime = r.CreatedAt;
                }

                var sampleName = "N/A";
                if (sampleMap.TryGetValue(r.QCSampleId, out var s))
                {
                    sampleName = $"{s.LotNumber} - {s.Level}";
                    if (instrMap.TryGetValue(s.InstrumentId, out var instr))
                        sampleName += $" ({instr})";
                }

                return new RecentActivityDto(
                    r.Id,
                    userName,
                    action,
                    paramMap.GetValueOrDefault(r.TestFileParameterId, "N/A"),
                    sampleName,
                    r.Value,
                    r.WestgardFlags,
                    r.ValidationStatus,
                    r.AuthorisationStatus,
                    activityTime);
            })
            .ToList();

        return Result<IEnumerable<RecentActivityDto>>.Success(recent);
    }
}
