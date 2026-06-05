using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;

namespace QCModule.Application.Features.Users.Commands.CreateUser;

public record CreateUserCommand(
    string  Name,
    string? Nickname,
    string  Email,
    string  Password,
    Guid    RoleId
) : IRequest<Result<UserDto>>;
