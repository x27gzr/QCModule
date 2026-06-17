using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.QCResults.Queries.ExportLeveyJennings;

/// <summary>
/// Exports the monthly RSUP Makassar PMI form (Levey-Jennings worksheet + evaluation sheet)
/// for one QC sample + parameter. Year/Month select which month the form represents;
/// when omitted, the month of the latest result (or today) is used.
/// </summary>
public record ExportLeveyJenningsQuery(
    Guid  QCSampleId,
    Guid  TestFileParameterId,
    int?  Year  = null,
    int?  Month = null
) : IRequest<Result<FileExportResult>>;
