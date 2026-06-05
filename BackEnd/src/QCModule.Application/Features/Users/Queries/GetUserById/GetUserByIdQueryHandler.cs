using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Users.Queries.GetUserById;

public class GetUserByIdQueryHandler(
    IRepository<User> userRepo,
    IRepository<Role> roleRepo)
    : IRequestHandler<GetUserByIdQuery, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var users = await userRepo.FindAsync(u => u.Id == request.Id, cancellationToken);
        var user  = users.FirstOrDefault()
            ?? throw new NotFoundException("User", request.Id);

        var roles = await roleRepo.FindAsync(r => r.Id == user.RoleId, cancellationToken);
        var role  = roles.FirstOrDefault()
            ?? throw new NotFoundException("Role", user.RoleId);

        return Result<UserDto>.Success(new UserDto(
            user.Id, user.Name, user.Nickname, user.Email, role.Name,
            user.IsActive, user.LastLoginAt, user.CreatedAt));
    }
}
