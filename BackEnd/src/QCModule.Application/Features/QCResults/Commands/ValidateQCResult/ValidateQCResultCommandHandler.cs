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

/// <summary>Validate many pending results at once. Skips out-of-control (Westgard-rejected)
/// results so the analyst reviews those individually.</summary>
public class BatchValidateCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork,
    ICurrentUserService   currentUser)
    : IRequestHandler<BatchValidateCommand, Result<BatchValidateResult>>
{
    public async Task<Result<BatchValidateResult>> Handle(BatchValidateCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException();
        var now    = DateTime.UtcNow;

        var ids = request.ResultIds is { Count: > 0 } ? request.ResultIds.ToHashSet() : null;

        var candidates = await repo.FindAsync(r =>
            r.ValidationStatus == ValidationStatus.Pending
            && (ids == null || ids.Contains(r.Id))
            && (request.QCSampleId == null          || r.QCSampleId == request.QCSampleId)
            && (request.TestFileParameterId == null || r.TestFileParameterId == request.TestFileParameterId),
            cancellationToken);

        var validated = 0;
        var skipped   = 0;

        foreach (var result in candidates)
        {
            // Don't blindly validate out-of-control results — analyst must review those.
            if (result.Status == QCStatus.Rejected)
            {
                skipped++;
                continue;
            }

            result.ValidationStatus = ValidationStatus.Validated;
            result.ValidatedBy      = userId;
            result.ValidatedAt      = now;
            await repo.UpdateAsync(result, cancellationToken);
            validated++;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var msg = $"{validated} hasil divalidasi."
                + (skipped > 0 ? $" {skipped} dilewati (out-of-control, perlu review manual)." : "");
        return Result<BatchValidateResult>.Success(new BatchValidateResult(validated, skipped), msg);
    }
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
