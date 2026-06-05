namespace QCModule.Application.Features.QCSamples.DTOs;

public record QCSampleDto(
    Guid     Id,
    string   Name,
    string   LotNumber,
    string   Level,
    DateTime ExpiryDate,
    Guid     InstrumentId,
    string   InstrumentName,
    bool     IsExpired,
    bool     ExpiresSoon,
    DateTime CreatedAt
);

public record QCSampleSummaryDto(
    Guid     Id,
    string   Name,
    string   LotNumber,
    string   Level,
    DateTime ExpiryDate,
    string   InstrumentName,
    bool     IsExpired,
    bool     ExpiresSoon
);
