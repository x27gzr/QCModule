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
    Guid      Id,
    string    QCSampleName,
    string    Level,
    string    ParameterName,
    string?   Unit,
    DateTime  ResultDate,
    double    Value,
    double    ZScore,
    QCStatus  Status,
    string?   WestgardFlags
);
