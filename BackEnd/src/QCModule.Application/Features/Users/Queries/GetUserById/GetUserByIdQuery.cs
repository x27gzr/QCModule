using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;

namespace QCModule.Application.Features.Users.Queries.GetUserById;

public record GetUserByIdQuery(Guid Id) : IRequest<Result<UserDto>>;
