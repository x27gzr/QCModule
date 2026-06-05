using MediatR;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.QCResults.Commands.AuthoriseQCResult;

/// <summary>Stage 2 — doctor authorises a validated QC result.</summary>
public record AuthoriseQCResultCommand(Guid Id, string? Note) : IRequest<Result<bool>>;

/// <summary>Reverts a doctor authorisation back to Pending.</summary>
public record CancelAuthorisationCommand(Guid Id, string Reason) : IRequest<Result<bool>>;

/// <summary>Authorise many validated results at once.</summary>
public record BatchAuthoriseCommand(IReadOnlyList<Guid> ResultIds, string? Note)
    : IRequest<Result<BatchAuthoriseResult>>;

public record BatchAuthoriseResult(int AuthorisedCount, IReadOnlyList<Guid> FailedIds);
