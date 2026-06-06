using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.API.Controllers;

/// <summary>
/// One-time setup endpoint. Only works when no users exist in the database.
/// Automatically disabled (returns 409) after the first admin is created.
/// </summary>
[ApiController]
[Route("api/setup")]
[AllowAnonymous]
public class SetupController(
    IRepository<User> userRepo,
    IRepository<Role> roleRepo,
    IUnitOfWork       unitOfWork,
    IPasswordHasher   passwordHasher,
    IConfiguration    configuration) : ControllerBase
{
    [HttpPost("admin")]
    public async Task<ActionResult<Result<UserDto>>> CreateFirstAdmin(
        [FromBody] CreateAdminRequest request,
        CancellationToken ct)
    {
        // Block if any user already exists.
        var count = await userRepo.CountAsync(cancellationToken: ct);
        if (count > 0)
            throw new ConflictException("Setup has already been completed. This endpoint is disabled.");

        var roles = await roleRepo.FindAsync(r => r.Name == "Admin", ct);
        var adminRole = roles.FirstOrDefault()
            ?? throw new NotFoundException("Admin role was not found. Ensure migrations have been applied.");

        var normalizedEmail = request.Email.Trim().ToLower();

        var user = new User
        {
            Name         = request.Name.Trim(),
            Email        = normalizedEmail,
            PasswordHash = passwordHasher.Hash(request.Password),
            RoleId       = adminRole.Id,
            IsActive     = true
        };

        await userRepo.AddAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return Ok(Result<UserDto>.Success(
            new UserDto(user.Id, user.Name, user.Nickname, user.Email, "Admin", user.IsActive, null, user.CreatedAt),
            "Admin user created successfully. This endpoint is now disabled."));
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<Result<string>>> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken ct)
    {
        var expectedSecret = configuration["Setup:ResetSecret"];
        if (string.IsNullOrWhiteSpace(expectedSecret) || request.Secret != expectedSecret)
            return Unauthorized(Result<string>.Failure("Invalid secret key."));

        var users = await userRepo.FindAsync(u => u.Email == request.Email.Trim().ToLower(), ct);
        var user = users.FirstOrDefault()
            ?? throw new NotFoundException($"User '{request.Email}' not found.");

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        await userRepo.UpdateAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return Ok(Result<string>.Success(user.Email, "Password reset successfully."));
    }
}

public record CreateAdminRequest(string Name, string Email, string Password);
public record ResetPasswordRequest(string Secret, string Email, string NewPassword);
