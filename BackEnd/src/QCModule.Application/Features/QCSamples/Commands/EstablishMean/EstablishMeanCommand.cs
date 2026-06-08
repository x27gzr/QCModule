using MediatR;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.QCSamples.Commands.EstablishMean;

/// <summary>Establish target Mean/SD/CV for selected parameters from QC results
/// in a date range (computed values become the new target).</summary>
public record EstablishMeanCommand(
    Guid                QCSampleId,
    DateTime?           DateFrom,
    DateTime?           DateTo,
    IReadOnlyList<Guid> TestFileParameterIds
) : IRequest<Result<EstablishMeanResult>>;

public record EstablishMeanResult(int Applied, int Skipped);
