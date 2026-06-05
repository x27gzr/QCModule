using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Users.Commands.UpdateUser;

public class UpdateUserCommandHandler(
    IRepository<User> userRepo,
    IRepository<Role> roleRepo,
    IUnitOfWork       unitOfWork)
    : IRequestHandler<UpdateUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var users = await userRepo.FindAsync(u => u.Id == request.Id, cancellationToken);
        var user  = users.FirstOrDefault()
            ?? throw new NotFoundException("User", request.Id);

        var normalizedEmail = request.Email.Trim().ToLower();

        // Check email uniqueness — exclude the current user from the check.
        var emailTaken = await userRepo.FindAsync(
            u => u.Email == normalizedEmail && u.Id != request.Id, cancellationToken);
        if (emailTaken.Any())
            throw new ConflictException($"Email '{normalizedEmail}' is already in use by another user.");

        var roles = await roleRepo.FindAsync(r => r.Id == request.RoleId, cancellationToken);
        var role  = roles.FirstOrDefault()
            ?? throw new NotFoundException("Role", request.RoleId);

        user.Name   = request.Name.Trim();
        user.Email  = normalizedEmail;
        user.RoleId = request.RoleId;

        await userRepo.UpdateAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<UserDto>.Success(
            new UserDto(user.Id, user.Name, user.Email, role.Name, user.IsActive, user.LastLoginAt, user.CreatedAt),
            "User updated successfully.");
    }
}
