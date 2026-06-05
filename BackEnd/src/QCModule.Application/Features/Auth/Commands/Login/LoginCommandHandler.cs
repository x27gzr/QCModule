using System.Security.Cryptography;
using MediatR;
using Microsoft.Extensions.Options;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Application.Common.Settings;
using QCModule.Application.Features.Auth.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler(
    IRepository<User>       userRepo,
    IRepository<Role>       roleRepo,
    IRefreshTokenRepository refreshTokenRepo,
    IUnitOfWork             unitOfWork,
    IJwtService             jwtService,
    IPasswordHasher         passwordHasher,
    IOptions<JwtSettings>   jwtSettings)
    : IRequestHandler<LoginCommand, Result<AuthTokens>>
{
    public async Task<Result<AuthTokens>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLower();

        var users = await userRepo.FindAsync(u => u.Email == normalizedEmail, cancellationToken);
        var user  = users.FirstOrDefault();

        // Use the same error message for "not found" and "wrong password" to prevent email enumeration.
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new DomainException("Invalid email or password.");

        if (!user.IsActive)
            throw new ForbiddenException("Your account has been deactivated. Please contact your administrator.");

        var roles = await roleRepo.FindAsync(r => r.Id == user.RoleId, cancellationToken);
        var role  = roles.FirstOrDefault()
            ?? throw new NotFoundException($"Role for user '{user.Email}' was not found.");

        user.LastLoginAt = DateTime.UtcNow;
        await userRepo.UpdateAsync(user, cancellationToken);

        var settings        = jwtSettings.Value;
        var accessToken     = jwtService.GenerateToken(user, role.Name);
        var rawRefreshToken = GenerateSecureToken();

        await refreshTokenRepo.AddAsync(new RefreshToken
        {
            Token     = rawRefreshToken,
            UserId    = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(settings.RefreshTokenExpirationDays)
        }, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var response = new AuthResponse(
            AccessToken: accessToken,
            TokenType:   "Bearer",
            ExpiresIn:   settings.AccessTokenExpirationMinutes * 60,
            UserId:      user.Id,
            Name:        user.Name,
            Email:       user.Email,
            Role:        role.Name);

        return Result<AuthTokens>.Success(new AuthTokens(response, rawRefreshToken));
    }

    private static string GenerateSecureToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
