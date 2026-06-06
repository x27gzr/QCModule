using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Queries.GetLeveyJennings;

public class GetLeveyJenningsQueryHandler(
    IRepository<QCResult>          resultRepo,
    IRepository<QCSample>          sampleRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<QCSampleTarget>    targetRepo)
    : IRequestHandler<GetLeveyJenningsQuery, Result<LeveyJenningsDto>>
{
    public async Task<Result<LeveyJenningsDto>> Handle(GetLeveyJenningsQuery request, CancellationToken cancellationToken)
    {
        var samples = await sampleRepo.FindAsync(s => s.Id == request.QCSampleId, cancellationToken);
        var sample  = samples.FirstOrDefault()
            ?? throw new NotFoundException("QC Sample", request.QCSampleId);

        var params_ = await paramRepo.FindAsync(p => p.Id == request.TestFileParameterId, cancellationToken);
        var param   = params_.FirstOrDefault()
            ?? throw new NotFoundException("Test File Parameter", request.TestFileParameterId);

        var targets = await targetRepo.FindAsync(
            t => t.QCSampleId == request.QCSampleId && t.TestFileParameterId == request.TestFileParameterId,
            cancellationToken);
        var target = targets.FirstOrDefault();

        var mean = target?.Mean ?? 0;
        var sd   = target?.SD   ?? 0;
        var cv   = target?.CV   ?? 0;

        var results = await resultRepo.FindAsync(
            r => r.QCSampleId == request.QCSampleId && r.TestFileParameterId == request.TestFileParameterId,
            cancellationToken);

        var filtered = results.AsEnumerable();
        if (request.DateFrom.HasValue) filtered = filtered.Where(r => r.ResultDate >= request.DateFrom.Value);
        if (request.DateTo.HasValue)   filtered = filtered.Where(r => r.ResultDate <= request.DateTo.Value);

        var ordered = filtered.OrderBy(r => r.ResultDate).ToList();

        // Calculated stats from last 20 displayed points
        var display     = ordered.TakeLast(20).ToList();
        var displayN    = display.Count;
        var calcMean    = displayN > 0 ? display.Average(r => r.Value) : 0;
        var calcSD      = displayN > 1
            ? Math.Sqrt(display.Sum(r => Math.Pow(r.Value - calcMean, 2)) / (displayN - 1))
            : 0;
        var calcCV      = calcMean > 0 ? calcSD / calcMean * 100 : 0;

        var points = ordered.Select(r => new LeveyJenningsPointDto(
            r.Id, r.ResultDate, r.Value, r.ZScore, r.Status, r.WestgardFlags));

        var dto = new LeveyJenningsDto(
            QCSampleId:          sample.Id,
            QCSampleName:        sample.Name,
            Level:               sample.Level,
            TestFileParameterId: param.Id,
            ParameterName:       param.ParameterName,
            Unit:                param.Unit,
            HasTarget:           target is not null,
            Mean:                mean,
            SD:                  sd,
            CV:                  cv,
            Plus1SD:             mean + 1 * sd,
            Plus2SD:             mean + 2 * sd,
            Plus3SD:             mean + 3 * sd,
            Minus1SD:            mean - 1 * sd,
            Minus2SD:            mean - 2 * sd,
            Minus3SD:            mean - 3 * sd,
            TotalCount:          ordered.Count,
            AcceptedCount:       ordered.Count(r => r.Status == QCStatus.Accepted),
            WarningCount:        ordered.Count(r => r.Status == QCStatus.Warning),
            RejectedCount:       ordered.Count(r => r.Status == QCStatus.Rejected),
            CalculatedMean:      Math.Round(calcMean, 3),
            CalculatedSD:        Math.Round(calcSD,   3),
            CalculatedCV:        Math.Round(calcCV,   2),
            DisplayCount:        displayN,
            Points:              points);

        return Result<LeveyJenningsDto>.Success(dto);
    }
}
