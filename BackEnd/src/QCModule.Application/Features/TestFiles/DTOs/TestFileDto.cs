namespace QCModule.Application.Features.TestFiles.DTOs;

public record ParameterInput(
    string  ParameterName,
    string? TestCode,
    string? OutputMask,
    int     Sequence
);

public record TestFileParameterDto(
    Guid    Id,
    string  ParameterName,
    string? TestCode,
    string? OutputMask,
    int     Sequence,
    string? Unit,
    double? LowerLimit,
    double? UpperLimit
);

public record TestFileDto(
    Guid                              Id,
    string                            Name,
    string                            Code,
    string                            Type,
    string?                           Unit,
    bool                              IsActive,
    IEnumerable<TestFileParameterDto> Parameters,
    DateTime                          CreatedAt
);

public record TestFileSummaryDto(
    Guid    Id,
    string  Name,
    string  Code,
    string  Type,
    bool    IsActive,
    int     ParameterCount
);
