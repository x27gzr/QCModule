using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;

namespace QCModule.Application.Features.Users.Commands.UpdateUser;

public record UpdateUserCommand(
    Guid   Id,
    string Name,
    string Email,
    Guid   RoleId
) : IRequest<Result<UserDto>>;
