namespace QCModule.Application.Features.Instruments.DTOs;

public record InstrumentDto(
    Guid     Id,
    string   Name,
    string   Code,
    bool     IsActive,
    Guid     TestFileId,
    string   TestFileName,
    DateTime CreatedAt
);

public record InstrumentSummaryDto(
    Guid   Id,
    string Name,
    string Code,
    bool   IsActive,
    Guid   TestFileId,
    string TestFileName
);
