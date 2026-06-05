using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;

namespace QCModule.Application.Features.QCResults.Queries.GetLeveyJennings;

public record GetLeveyJenningsQuery(
    Guid      QCSampleId,
    Guid      TestFileParameterId,
    DateTime? DateFrom = null,
    DateTime? DateTo   = null
) : IRequest<Result<LeveyJenningsDto>>;
