using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.Queries.GetEstablishPreview;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Commands.EstablishMean;

public class EstablishMeanCommandHandler(
    IRepository<QCSample>       sampleRepo,
    IRepository<QCSampleTarget> targetRepo,
    IRepository<QCResult>       resultRepo,
    IUnitOfWork                 unitOfWork)
    : IRequestHandler<EstablishMeanCommand, Result<EstablishMeanResult>>
{
    public async Task<Result<EstablishMeanResult>> Handle(EstablishMeanCommand request, CancellationToken cancellationToken)
    {
        if (request.TestFileParameterIds.Count == 0)
            throw new DomainException("Tidak ada parameter yang dipilih.");

        var samples = await sampleRepo.FindAsync(s => s.Id == request.QCSampleId, cancellationToken);
        if (!samples.Any()) throw new NotFoundException("QC Sample", request.QCSampleId);

        var ids = request.TestFileParameterIds.ToHashSet();

        var results = (await resultRepo.FindAsync(
            r => r.QCSampleId == request.QCSampleId
                 && r.ValidationStatus != ValidationStatus.Rejected
                 && ids.Contains(r.TestFileParameterId),
            cancellationToken)).AsEnumerable();
        if (request.DateFrom.HasValue) results = results.Where(r => r.ResultDate >= request.DateFrom.Value);
        if (request.DateTo.HasValue)   results = results.Where(r => r.ResultDate <= request.DateTo.Value);

        var byParam = results
            .GroupBy(r => r.TestFileParameterId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Value).ToList());

        var targets   = (await targetRepo.FindAsync(t => t.QCSampleId == request.QCSampleId, cancellationToken)).ToList();
        var targetMap = targets.ToDictionary(t => t.TestFileParameterId);

        var applied = 0;
        var skipped = 0;

        foreach (var paramId in request.TestFileParameterIds)
        {
            byParam.TryGetValue(paramId, out var vals);
            var (mean, sd, cv, n) = GetEstablishPreviewQueryHandler.Stats(vals);

            // Need at least 2 points to compute SD; otherwise skip.
            if (n < 2 || sd <= 0 || mean == 0) { skipped++; continue; }

            if (targetMap.TryGetValue(paramId, out var target))
            {
                target.Mean = Math.Round(mean, 3);
                target.SD   = Math.Round(sd,   3);
                target.CV   = Math.Round(cv,   2);
                await targetRepo.UpdateAsync(target, cancellationToken);
            }
            else
            {
                await targetRepo.AddAsync(new QCSampleTarget
                {
                    QCSampleId          = request.QCSampleId,
                    TestFileParameterId = paramId,
                    Mean    = Math.Round(mean, 3),
                    SD      = Math.Round(sd,   3),
                    CV      = Math.Round(cv,   2),
                    TeaUnit = "%",
                }, cancellationToken);
            }
            applied++;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var msg = $"{applied} target ditetapkan dari data."
                + (skipped > 0 ? $" {skipped} dilewati (data < 2 titik)." : "");
        return Result<EstablishMeanResult>.Success(new EstablishMeanResult(applied, skipped), msg);
    }
}
