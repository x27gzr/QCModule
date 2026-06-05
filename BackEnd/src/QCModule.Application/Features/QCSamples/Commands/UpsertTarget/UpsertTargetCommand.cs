using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;

namespace QCModule.Application.Features.QCSamples.Commands.UpsertTarget;

public record UpsertTargetCommand(
    Guid   QCSampleId,
    Guid   TestFileParameterId,
    double Mean,
    double SD,
    double CV
) : IRequest<Result<QCSampleTargetDto>>;
