using MediatR;

namespace QCModule.Application.Features.Users.Commands.DeleteUser;

public record DeleteUserCommand(Guid Id, Guid RequestingUserId) : IRequest;
