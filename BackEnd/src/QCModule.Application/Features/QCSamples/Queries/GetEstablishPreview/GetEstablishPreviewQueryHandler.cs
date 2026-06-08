using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Queries.GetEstablishPreview;

public class GetEstablishPreviewQueryHandler(
    IRepository<QCSample>          sampleRepo,
    IRepository<Instrument>        instrumentRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<QCSampleTarget>    targetRepo,
    IRepository<QCResult>          resultRepo)
    : IRequestHandler<GetEstablishPreviewQuery, Result<IReadOnlyList<EstablishPreviewDto>>>
{
    public async Task<Result<IReadOnlyList<EstablishPreviewDto>>> Handle(GetEstablishPreviewQuery request, CancellationToken cancellationToken)
    {
        var sample = (await sampleRepo.FindAsync(s => s.Id == request.QCSampleId, cancellationToken)).FirstOrDefault()
            ?? throw new NotFoundException("QC Sample", request.QCSampleId);
        var instrument = (await instrumentRepo.FindAsync(i => i.Id == sample.InstrumentId, cancellationToken)).FirstOrDefault()
            ?? throw new NotFoundException("Instrument", sample.InstrumentId);

        var prms    = (await paramRepo.FindAsync(p => p.TestFileId == instrument.TestFileId, cancellationToken))
            .OrderBy(p => p.Sequence).ToList();
        var targets = (await targetRepo.FindAsync(t => t.QCSampleId == request.QCSampleId, cancellationToken)).ToList();
        var targetMap = targets.ToDictionary(t => t.TestFileParameterId);

        // In-control results (exclude analyst-rejected) in the chosen range.
        var results = (await resultRepo.FindAsync(
            r => r.QCSampleId == request.QCSampleId && r.ValidationStatus != ValidationStatus.Rejected,
            cancellationToken)).AsEnumerable();
        if (request.DateFrom.HasValue) results = results.Where(r => r.ResultDate >= request.DateFrom.Value);
        if (request.DateTo.HasValue)   results = results.Where(r => r.ResultDate <= request.DateTo.Value);

        var byParam = results
            .GroupBy(r => r.TestFileParameterId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Value).ToList());

        var list = prms.Select(p =>
        {
            targetMap.TryGetValue(p.Id, out var tgt);
            byParam.TryGetValue(p.Id, out var vals);
            var (mean, sd, cv, n) = Stats(vals);
            return new EstablishPreviewDto(
                p.Id, p.ParameterName, p.Unit,
                tgt is not null, tgt?.Mean, tgt?.SD, tgt?.CV,
                n,
                n > 0 ? Math.Round(mean, 3) : null,
                n > 1 ? Math.Round(sd,   3) : null,
                n > 1 ? Math.Round(cv,   2) : null);
        }).ToList();

        return Result<IReadOnlyList<EstablishPreviewDto>>.Success(list);
    }

    internal static (double Mean, double SD, double CV, int N) Stats(List<double>? values)
    {
        if (values is null || values.Count == 0) return (0, 0, 0, 0);
        var n    = values.Count;
        var mean = values.Average();
        var sd   = n > 1 ? Math.Sqrt(values.Sum(v => (v - mean) * (v - mean)) / (n - 1)) : 0;
        var cv   = mean != 0 ? sd / mean * 100 : 0;
        return (mean, sd, cv, n);
    }
}
