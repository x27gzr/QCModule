using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Users.Commands.DeleteUser;

public class DeleteUserCommandHandler(
    IRepository<User>       userRepo,
    IRefreshTokenRepository refreshTokenRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<DeleteUserCommand>
{
    public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        if (request.Id == request.RequestingUserId)
            throw new DomainException("You cannot delete your own account.");

        var users = await userRepo.FindAsync(u => u.Id == request.Id, cancellationToken);
        var user  = users.FirstOrDefault()
            ?? throw new NotFoundException("User", request.Id);

        // Revoke all active sessions before soft-deleting.
        await refreshTokenRepo.RevokeAllForUserAsync(user.Id, cancellationToken);
        await userRepo.DeleteAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
