using MediatR;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.QCResults.Commands.ValidateQCResult;

/// <summary>Stage 1 — analyst validates (or rejects) a QC result.</summary>
public record ValidateQCResultCommand(
    Guid    Id,
    bool    Reject,        // false = Validate, true = Reject
    string? Note
) : IRequest<Result<bool>>;

/// <summary>Reverts an analyst validation back to Pending. Blocked once a doctor has authorised.</summary>
public record CancelValidationCommand(Guid Id, string Reason) : IRequest<Result<bool>>;

/// <summary>Validate many pending results at once (analyst). Optionally scoped to a sample/parameter.</summary>
public record BatchValidateCommand(
    IReadOnlyList<Guid>? ResultIds = null,
    Guid?                QCSampleId = null,
    Guid?                TestFileParameterId = null
) : IRequest<Result<BatchValidateResult>>;

public record BatchValidateResult(int ValidatedCount, int SkippedCount);
