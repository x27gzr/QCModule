using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;

namespace QCModule.Application.Features.QCResults.Commands.CreateQCResult;

public record CreateQCResultCommand(
    Guid      QCSampleId,
    Guid      TestFileParameterId,
    DateTime  ResultDate,
    double    Value,
    string?   Comment
) : IRequest<Result<QCResultDto>>;
