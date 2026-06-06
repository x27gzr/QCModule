using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Queries.GetQCSampleTargets;

public class GetQCSampleTargetsQueryHandler(
    IRepository<QCSampleTarget>    targetRepo,
    IRepository<TestFileParameter> paramRepo)
    : IRequestHandler<GetQCSampleTargetsQuery, Result<IEnumerable<QCSampleTargetDto>>>
{
    public async Task<Result<IEnumerable<QCSampleTargetDto>>> Handle(
        GetQCSampleTargetsQuery request, CancellationToken cancellationToken)
    {
        var targets = await targetRepo.FindAsync(t => t.QCSampleId == request.QCSampleId, cancellationToken);
        var params_ = await paramRepo.GetAllAsync(cancellationToken);
        var paramMap = params_.ToDictionary(p => p.Id);

        var dtos = targets.Select(t =>
        {
            paramMap.TryGetValue(t.TestFileParameterId, out var p);
            return new QCSampleTargetDto(
                t.Id, t.QCSampleId, t.TestFileParameterId,
                p?.ParameterName ?? "Unknown", p?.Unit, t.Mean, t.SD, t.CV, t.Tea, t.TeaUnit);
        }).OrderBy(t => t.ParameterName);

        return Result<IEnumerable<QCSampleTargetDto>>.Success(dtos);
    }
}
