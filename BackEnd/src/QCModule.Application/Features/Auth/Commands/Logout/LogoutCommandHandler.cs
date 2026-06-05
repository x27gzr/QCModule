using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Auth.Commands.Logout;

public class LogoutCommandHandler(
    IRefreshTokenRepository refreshTokenRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<LogoutCommand>
{
    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var stored = await refreshTokenRepo.GetByTokenAsync(request.RefreshToken, cancellationToken);

        // Silently succeed if token not found — idempotent logout.
        if (stored is null || stored.IsRevoked) return;

        await refreshTokenRepo.RevokeAsync(stored, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
