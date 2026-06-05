using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Commands.ValidateQCResult;

public class ValidateQCResultCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork,
    ICurrentUserService   currentUser)
    : IRequestHandler<ValidateQCResultCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ValidateQCResultCommand request, CancellationToken cancellationToken)
    {
        var items  = await repo.FindAsync(r => r.Id == request.Id, cancellationToken);
        var result = items.FirstOrDefault() ?? throw new NotFoundException("QC Result", request.Id);

        if (result.AuthorisationStatus == AuthorisationStatus.Authorised)
            throw new DomainException("Cannot re-validate a result that has already been authorised by a doctor.");

        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException();

        result.ValidationStatus = request.Reject ? ValidationStatus.Rejected : ValidationStatus.Validated;
        result.ValidatedBy      = userId;
        result.ValidatedAt      = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Note))
            result.Comment = AppendNote(result.Comment, $"Analyst: {request.Note.Trim()}");

        await repo.UpdateAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, request.Reject ? "Result rejected by analyst." : "Result validated by analyst.");
    }

    internal static string AppendNote(string? existing, string note) =>
        string.IsNullOrWhiteSpace(existing) ? note : $"{existing}\n{note}";
}

public class CancelValidationCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork)
    : IRequestHandler<CancelValidationCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(CancelValidationCommand request, CancellationToken cancellationToken)
    {
        var items  = await repo.FindAsync(r => r.Id == request.Id, cancellationToken);
        var result = items.FirstOrDefault() ?? throw new NotFoundException("QC Result", request.Id);

        if (result.AuthorisationStatus == AuthorisationStatus.Authorised)
            throw new DomainException("Cannot cancel validation: the result is already authorised by a doctor. Cancel the doctor authorisation first.");

        if (result.ValidationStatus == ValidationStatus.Pending)
            throw new DomainException("Result is not validated.");

        result.ValidationStatus = ValidationStatus.Pending;
        result.ValidatedBy      = null;
        result.ValidatedAt      = null;
        result.Comment          = ValidateQCResultCommandHandler.AppendNote(result.Comment, $"Validation cancelled: {request.Reason.Trim()}");

        await repo.UpdateAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, "Analyst validation cancelled.");
    }
}
