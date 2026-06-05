using QCModule.Domain.Enums;

namespace QCModule.Application.Features.QCResults.DTOs;

public record LeveyJenningsPointDto(
    Guid     ResultId,
    DateTime ResultDate,
    double   Value,
    double   ZScore,
    QCStatus Status,
    string?  WestgardFlags
);

public record LeveyJenningsDto(
    Guid                            QCSampleId,
    string                          QCSampleName,
    string                          Level,
    Guid                            TestFileParameterId,
    string                          ParameterName,
    string?                         Unit,
    bool                            HasTarget,
    double                          Mean,
    double                          SD,
    double                          CV,
    // Pre-computed control limits for convenience
    double                          Plus1SD,
    double                          Plus2SD,
    double                          Plus3SD,
    double                          Minus1SD,
    double                          Minus2SD,
    double                          Minus3SD,
    int                             TotalCount,
    int                             AcceptedCount,
    int                             WarningCount,
    int                             RejectedCount,
    IEnumerable<LeveyJenningsPointDto> Points
);
