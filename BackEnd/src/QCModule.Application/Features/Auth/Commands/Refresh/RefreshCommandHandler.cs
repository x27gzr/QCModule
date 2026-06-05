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

namespace QCModule.Application.Features.Auth.Commands.Refresh;

public class RefreshCommandHandler(
    IRepository<User>       userRepo,
    IRepository<Role>       roleRepo,
    IRefreshTokenRepository refreshTokenRepo,
    IUnitOfWork             unitOfWork,
    IJwtService             jwtService,
    IOptions<JwtSettings>   jwtSettings)
    : IRequestHandler<RefreshCommand, Result<AuthTokens>>
{
    public async Task<Result<AuthTokens>> Handle(RefreshCommand request, CancellationToken cancellationToken)
    {
        var stored = await refreshTokenRepo.GetByTokenAsync(request.RefreshToken, cancellationToken);

        if (stored is null || stored.ExpiresAt <= DateTime.UtcNow)
            throw new DomainException("Refresh token is invalid or has expired. Please log in again.");

        // Detect token reuse — a revoked token being presented may indicate theft.
        // Revoke the entire user session as a precaution.
        if (stored.IsRevoked)
        {
            await refreshTokenRepo.RevokeAllForUserAsync(stored.UserId, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            throw new DomainException("Refresh token has already been used. All sessions have been revoked for security. Please log in again.");
        }

        var users = await userRepo.FindAsync(u => u.Id == stored.UserId, cancellationToken);
        var user  = users.FirstOrDefault()
            ?? throw new NotFoundException("User", stored.UserId);

        if (!user.IsActive)
            throw new ForbiddenException("Your account has been deactivated. Please contact your administrator.");

        var roles = await roleRepo.FindAsync(r => r.Id == user.RoleId, cancellationToken);
        var role  = roles.FirstOrDefault()
            ?? throw new NotFoundException($"Role for user '{user.Email}' was not found.");

        // Rotate: revoke old token, issue a new one.
        await refreshTokenRepo.RevokeAsync(stored, cancellationToken);

        var settings       = jwtSettings.Value;
        var newRawToken    = GenerateSecureToken();

        await refreshTokenRepo.AddAsync(new RefreshToken
        {
            Token     = newRawToken,
            UserId    = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(settings.RefreshTokenExpiryDays)
        }, cancellationToken);

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var accessToken = jwtService.GenerateToken(user, role.Name);

        var response = new AuthResponse(
            AccessToken: accessToken,
            TokenType:   "Bearer",
            ExpiresIn:   settings.ExpiryMinutes * 60,
            UserId:      user.Id,
            Name:        user.Name,
            Email:       user.Email,
            Role:        role.Name);

        return Result<AuthTokens>.Success(new AuthTokens(response, newRawToken));
    }

    private static string GenerateSecureToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
