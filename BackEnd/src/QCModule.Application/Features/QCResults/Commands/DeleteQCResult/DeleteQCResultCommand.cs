using MediatR;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.QCResults.Commands.DeleteQCResult;

public record DeleteQCResultCommand(Guid Id, string Reason) : IRequest<Result<bool>>;
