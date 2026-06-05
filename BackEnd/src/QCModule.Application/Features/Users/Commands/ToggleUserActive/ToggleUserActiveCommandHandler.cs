using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Users.Commands.ToggleUserActive;

public class ToggleUserActiveCommandHandler(
    IRepository<User>       userRepo,
    IRefreshTokenRepository refreshTokenRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<ToggleUserActiveCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ToggleUserActiveCommand request, CancellationToken cancellationToken)
    {
        if (request.Id == request.RequestingUserId)
            throw new DomainException("You cannot deactivate your own account.");

        var users = await userRepo.FindAsync(u => u.Id == request.Id, cancellationToken);
        var user  = users.FirstOrDefault()
            ?? throw new NotFoundException("User", request.Id);

        user.IsActive = !user.IsActive;

        // When deactivating: revoke all active sessions immediately.
        if (!user.IsActive)
            await refreshTokenRepo.RevokeAllForUserAsync(user.Id, cancellationToken);

        await userRepo.UpdateAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var status  = user.IsActive ? "activated" : "deactivated";
        return Result<bool>.Success(user.IsActive, $"User has been {status}.");
    }
}
