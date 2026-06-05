using MediatR;

namespace QCModule.Application.Features.Users.Commands.ChangePassword;

public record ChangePasswordCommand(
    Guid    TargetUserId,
    Guid    RequestingUserId,
    string  RequestingUserRole,
    string? CurrentPassword,
    string  NewPassword,
    string  ConfirmPassword
) : IRequest;
