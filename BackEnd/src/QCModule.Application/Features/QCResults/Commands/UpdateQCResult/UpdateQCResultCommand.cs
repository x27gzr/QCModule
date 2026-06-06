using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;

namespace QCModule.Application.Features.QCResults.Commands.UpdateQCResult;

public record UpdateQCResultCommand(
    Guid     Id,
    DateTime ResultDate,
    double   Value,
    string?  Comment
) : IRequest<Result<QCResultDto>>;
