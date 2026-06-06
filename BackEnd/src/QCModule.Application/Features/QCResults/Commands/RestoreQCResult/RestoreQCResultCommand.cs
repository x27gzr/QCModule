using MediatR;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.QCResults.Commands.RestoreQCResult;

public record RestoreQCResultCommand(Guid Id) : IRequest<Result<bool>>;
