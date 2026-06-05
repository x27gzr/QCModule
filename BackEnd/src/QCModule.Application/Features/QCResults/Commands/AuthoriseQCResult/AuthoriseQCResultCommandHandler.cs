using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Commands.AuthoriseQCResult;

public class AuthoriseQCResultCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork,
    ICurrentUserService   currentUser)
    : IRequestHandler<AuthoriseQCResultCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AuthoriseQCResultCommand request, CancellationToken cancellationToken)
    {
        var items  = await repo.FindAsync(r => r.Id == request.Id, cancellationToken);
        var result = items.FirstOrDefault() ?? throw new NotFoundException("QC Result", request.Id);

        if (result.ValidationStatus != ValidationStatus.Validated)
            throw new DomainException("QC Result must be validated by an analyst before doctor authorisation.");

        if (result.AuthorisationStatus == AuthorisationStatus.Authorised)
            throw new DomainException("QC Result is already authorised by a doctor.");

        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException();

        result.AuthorisationStatus = AuthorisationStatus.Authorised;
        result.AuthorisedBy        = userId;
        result.AuthorisedAt        = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Note))
            result.Comment = AppendNote(result.Comment, $"Doctor: {request.Note.Trim()}");

        await repo.UpdateAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, "QC Result authorised by doctor successfully.");
    }

    internal static string AppendNote(string? existing, string note) =>
        string.IsNullOrWhiteSpace(existing) ? note : $"{existing}\n{note}";
}

public class CancelAuthorisationCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork)
    : IRequestHandler<CancelAuthorisationCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(CancelAuthorisationCommand request, CancellationToken cancellationToken)
    {
        var items  = await repo.FindAsync(r => r.Id == request.Id, cancellationToken);
        var result = items.FirstOrDefault() ?? throw new NotFoundException("QC Result", request.Id);

        if (result.AuthorisationStatus != AuthorisationStatus.Authorised)
            throw new DomainException("QC Result is not authorised by a doctor.");

        result.AuthorisationStatus = AuthorisationStatus.Pending;
        result.AuthorisedBy        = null;
        result.AuthorisedAt        = null;
        result.Comment             = AuthoriseQCResultCommandHandler.AppendNote(result.Comment, $"Authorisation cancelled: {request.Reason.Trim()}");

        await repo.UpdateAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, "Doctor authorisation cancelled successfully.");
    }
}

public class BatchAuthoriseCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork,
    ICurrentUserService   currentUser)
    : IRequestHandler<BatchAuthoriseCommand, Result<BatchAuthoriseResult>>
{
    public async Task<Result<BatchAuthoriseResult>> Handle(BatchAuthoriseCommand request, CancellationToken cancellationToken)
    {
        if (request.ResultIds.Count == 0)
            throw new DomainException("No QC results selected.");

        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException();
        var now    = DateTime.UtcNow;

        var ids     = request.ResultIds.ToHashSet();
        var results = await repo.FindAsync(r => ids.Contains(r.Id), cancellationToken);
        var byId    = results.ToDictionary(r => r.Id);

        var success = 0;
        var failed  = new List<Guid>();

        foreach (var id in request.ResultIds)
        {
            if (!byId.TryGetValue(id, out var result)
                || result.ValidationStatus != ValidationStatus.Validated
                || result.AuthorisationStatus == AuthorisationStatus.Authorised)
            {
                failed.Add(id);
                continue;
            }

            result.AuthorisationStatus = AuthorisationStatus.Authorised;
            result.AuthorisedBy        = userId;
            result.AuthorisedAt        = now;
            if (!string.IsNullOrWhiteSpace(request.Note))
                result.Comment = AuthoriseQCResultCommandHandler.AppendNote(result.Comment, $"Doctor: {request.Note.Trim()}");

            await repo.UpdateAsync(result, cancellationToken);
            success++;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<BatchAuthoriseResult>.Success(
            new BatchAuthoriseResult(success, failed),
            $"Successfully authorised {success} QC result(s)." + (failed.Count > 0 ? $" {failed.Count} skipped." : ""));
    }
}
