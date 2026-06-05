using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Users.Commands.ChangePassword;

public class ChangePasswordCommandHandler(
    IRepository<User> userRepo,
    IUnitOfWork       unitOfWork,
    IPasswordHasher   passwordHasher)
    : IRequestHandler<ChangePasswordCommand>
{
    public async Task Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var isOwnPassword = request.TargetUserId == request.RequestingUserId;
        var isAdmin       = request.RequestingUserRole == "Admin";

        if (!isOwnPassword && !isAdmin)
            throw new ForbiddenException("You can only change your own password.");

        var users = await userRepo.FindAsync(u => u.Id == request.TargetUserId, cancellationToken);
        var user  = users.FirstOrDefault()
            ?? throw new NotFoundException("User", request.TargetUserId);

        // Changing own password requires the current password for verification.
        if (isOwnPassword)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                throw new DomainException("Current password is required.");
            if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
                throw new DomainException("Current password is incorrect.");
        }

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        await userRepo.UpdateAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
