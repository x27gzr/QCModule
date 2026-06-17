using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Queries.ExportLeveyJennings;

public class ExportLeveyJenningsQueryHandler(
    IRepository<QCResult>          resultRepo,
    IRepository<QCSample>          sampleRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<QCSampleTarget>    targetRepo,
    IRepository<Instrument>        instrumentRepo,
    IPmiReportExporter             exporter)
    : IRequestHandler<ExportLeveyJenningsQuery, Result<FileExportResult>>
{
    private static readonly string[] IndoMonths =
    [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    public async Task<Result<FileExportResult>> Handle(ExportLeveyJenningsQuery request, CancellationToken cancellationToken)
    {
        var sample = (await sampleRepo.FindAsync(s => s.Id == request.QCSampleId, cancellationToken)).FirstOrDefault()
            ?? throw new NotFoundException("QC Sample", request.QCSampleId);

        var param = (await paramRepo.FindAsync(p => p.Id == request.TestFileParameterId, cancellationToken)).FirstOrDefault()
            ?? throw new NotFoundException("Test File Parameter", request.TestFileParameterId);

        var target = (await targetRepo.FindAsync(
            t => t.QCSampleId == request.QCSampleId && t.TestFileParameterId == request.TestFileParameterId,
            cancellationToken)).FirstOrDefault();

        var instrument = await instrumentRepo.GetByIdAsync(sample.InstrumentId, cancellationToken);

        var allResults = (await resultRepo.FindAsync(
            r => r.QCSampleId == request.QCSampleId && r.TestFileParameterId == request.TestFileParameterId,
            cancellationToken)).ToList();

        // Decide which month the form represents.
        DateTime anchor =
            request.Year.HasValue && request.Month.HasValue
                ? new DateTime(request.Year.Value, request.Month.Value, 1)
                : allResults.Count > 0
                    ? allResults.Max(r => r.ResultDate)
                    : DateTime.Today;
        int year  = anchor.Year;
        int month = anchor.Month;

        var monthRows = allResults
            .Where(r => r.ResultDate.Year == year && r.ResultDate.Month == month)
            .OrderBy(r => r.ResultDate)
            .Select(r => new PmiReportRow(r.ResultDate, r.Value, r.Status, r.WestgardFlags, r.Comment))
            .ToList();

        // Prefer established target; otherwise fall back to stats from the month's own data.
        double mean, sd, cv;
        bool hasTarget = target is not null;
        if (hasTarget)
        {
            mean = target!.Mean;
            sd   = target.SD;
            cv   = target.CV;
        }
        else
        {
            var vals = monthRows.Select(r => r.Value).ToList();
            mean = vals.Count > 0 ? vals.Average() : 0;
            sd   = vals.Count > 1 ? Math.Sqrt(vals.Sum(v => Math.Pow(v - mean, 2)) / (vals.Count - 1)) : 0;
            cv   = mean != 0 ? sd / mean * 100 : 0;
        }

        var model = new PmiReportModel(
            ParameterName:   param.ParameterName,
            Unit:            param.Unit,
            SampleName:      sample.Name,
            Level:           sample.Level,
            LotNumber:       sample.LotNumber,
            InstrumentName:  instrument?.Name ?? string.Empty,
            Year:            year,
            Month:           month,
            MonthLabel:      $"{IndoMonths[month]} {year}",
            HasTarget:       hasTarget,
            Mean:            mean,
            SD:              sd,
            CV:              cv,
            Minus2SD:        mean - 2 * sd,
            Plus2SD:         mean + 2 * sd,
            Rows:            monthRows);

        var file = exporter.Generate(model);

        var safeParam = string.Concat(param.ParameterName.Split(Path.GetInvalidFileNameChars()));
        var fileName  = $"PMI_{safeParam}_{sample.Level}_{year}-{month:D2}.xlsx"
            .Replace(' ', '_');

        return Result<FileExportResult>.Success(file with { FileName = fileName });
    }
}
