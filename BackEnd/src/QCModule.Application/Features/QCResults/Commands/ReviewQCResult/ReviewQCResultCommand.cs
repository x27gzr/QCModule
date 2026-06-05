using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Domain.Enums;

namespace QCModule.Application.Features.QCResults.Commands.ReviewQCResult;

public record ReviewQCResultCommand(
    Guid      Id,
    QCStatus  NewStatus,
    string?   Comment
) : IRequest<Result<bool>>;
