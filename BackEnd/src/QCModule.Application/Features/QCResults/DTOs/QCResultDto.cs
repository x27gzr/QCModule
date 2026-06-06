using QCModule.Domain.Enums;

namespace QCModule.Application.Features.QCResults.DTOs;

public record QCResultDto(
    Guid      Id,
    Guid      QCSampleId,
    string    QCSampleName,
    string    Level,
    Guid      TestFileParameterId,
    string    ParameterName,
    string?   Unit,
    string    EnteredByName,
    DateTime  ResultDate,
    double    Value,
    double    ZScore,
    QCStatus  Status,
    string?   WestgardFlags,
    string?   Comment
);

public record QCResultSummaryDto(
    Guid                Id,
    Guid                QCSampleId,
    Guid                TestFileParameterId,
    string              QCSampleName,
    string              Level,
    string              ParameterName,
    string?             Unit,
    string?             EnteredByName,
    DateTime            ResultDate,
    double              Value,
    double              ZScore,
    QCStatus            Status,
    string?             WestgardFlags,
    ValidationStatus    ValidationStatus,
    string?             ValidatedByName,
    DateTime?           ValidatedAt,
    AuthorisationStatus AuthorisationStatus,
    string?             AuthorisedByName,
    DateTime?           AuthorisedAt,
    bool                IsDeleted,
    string?             DeletedReason
);

public record AuthorisationSummaryDto(
    int       Total,
    int       Authorised,
    int       Pending,
    double    Percentage,
    string?   LastAuthoriserName,
    DateTime? LastAuthorisedAt,
    string?   LastParameterName
);
