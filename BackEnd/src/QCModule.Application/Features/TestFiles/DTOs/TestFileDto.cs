namespace QCModule.Application.Features.TestFiles.DTOs;

public record TestFileParameterDto(
    Guid    Id,
    string  ParameterName,
    string? Unit,
    double? LowerLimit,
    double? UpperLimit
);

public record TestFileDto(
    Guid                             Id,
    string                           Name,
    string                           Code,
    string?                          Unit,
    string?                          Category,
    bool                             IsActive,
    IEnumerable<TestFileParameterDto> Parameters,
    DateTime                         CreatedAt
);

public record TestFileSummaryDto(
    Guid    Id,
    string  Name,
    string  Code,
    string? Category,
    bool    IsActive,
    int     ParameterCount
);
