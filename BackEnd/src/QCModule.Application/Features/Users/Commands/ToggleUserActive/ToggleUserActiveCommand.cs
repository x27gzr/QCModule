using MediatR;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.Users.Commands.ToggleUserActive;

public record ToggleUserActiveCommand(Guid Id, Guid RequestingUserId) : IRequest<Result<bool>>;
