using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Users.Commands.CreateUser;

public class CreateUserCommandHandler(
    IRepository<User> userRepo,
    IRepository<Role> roleRepo,
    IUnitOfWork       unitOfWork,
    IPasswordHasher   passwordHasher)
    : IRequestHandler<CreateUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLower();

        var existing = await userRepo.FindAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (existing.Any())
            throw new ConflictException($"Email '{normalizedEmail}' is already in use.");

        var roles = await roleRepo.FindAsync(r => r.Id == request.RoleId, cancellationToken);
        var role  = roles.FirstOrDefault()
            ?? throw new NotFoundException("Role", request.RoleId);

        var user = new User
        {
            Name         = request.Name.Trim(),
            Nickname     = string.IsNullOrWhiteSpace(request.Nickname) ? null : request.Nickname.Trim(),
            Email        = normalizedEmail,
            PasswordHash = passwordHasher.Hash(request.Password),
            RoleId       = request.RoleId,
            IsActive     = true
        };

        await userRepo.AddAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<UserDto>.Success(
            new UserDto(user.Id, user.Name, user.Nickname, user.Email, role.Name, user.IsActive, null, user.CreatedAt),
            "User created successfully.");
    }
}
