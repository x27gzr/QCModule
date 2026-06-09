namespace QCModule.Application.Features.QCSamples.DTOs;

public record WestgardRulesDto(
    bool   Rule1_2s,
    bool   Rule1_3s,
    bool   Rule2_2s,
    bool   Rule2_2sDiff,
    bool   Rule4_1s,
    bool   Rule10x,
    bool   Rule7T,
    double RejectSD,
    int    NxCount,
    // legacy (Phase-2 across-material), kept so older clients don't break
    bool   Rule3_1s = false,
    bool   RuleR_4s = false,
    bool   Rule9x   = false
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
