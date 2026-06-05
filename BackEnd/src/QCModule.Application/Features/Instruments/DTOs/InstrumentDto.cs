namespace QCModule.Application.Features.Instruments.DTOs;

public record InstrumentDto(
    Guid    Id,
    string  Name,
    string  Code,
    string? Manufacturer,
    string? Model,
    string? SerialNumber,
    bool    IsActive,
    DateTime CreatedAt
);

public record InstrumentSummaryDto(
    Guid    Id,
    string  Name,
    string  Code,
    string? Manufacturer,
    bool    IsActive
);
