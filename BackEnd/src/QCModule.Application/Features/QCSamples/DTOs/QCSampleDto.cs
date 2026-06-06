namespace QCModule.Application.Features.QCSamples.DTOs;

public record WestgardRulesDto(
    bool Rule1_2s,
    bool Rule1_3s,
    bool Rule3_1s,
    bool Rule2_2s,
    bool RuleR_4s,
    bool Rule4_1s,
    bool Rule9x,
    bool Rule10x
);

public record QCSampleDto(
    Guid            Id,
    string          Name,
    string          LotNumber,
    string          Level,
    DateTime        ExpiryDate,
    Guid            InstrumentId,
    string          InstrumentName,
    bool            IsActive,
    bool            IsExpired,
    bool            ExpiresSoon,
    WestgardRulesDto WestgardRules,
    DateTime        CreatedAt
);

public record QCSampleSummaryDto(
    Guid     Id,
    string   Name,
    string   LotNumber,
    string   Level,
    DateTime ExpiryDate,
    string   InstrumentName,
    bool     IsActive,
    bool     IsExpired,
    bool     ExpiresSoon
);
