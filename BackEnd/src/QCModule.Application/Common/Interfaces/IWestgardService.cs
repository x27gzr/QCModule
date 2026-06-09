using QCModule.Domain.Enums;

namespace QCModule.Application.Common.Interfaces;

public record WestgardResult(QCStatus Status, string Flags, double ZScore);

/// <summary>Within-material Westgard rule configuration for one QC sample/level.</summary>
public record WestgardRuleSet(
    bool   Rule1_2s,      // Warning: outside 2SD
    bool   Rule1_3s,      // Reject: outside N SD
    bool   Rule2_2s,      // Reject: 2 consecutive outside 2SD, same side
    bool   Rule2_2sDiff,  // Reject: 2 consecutive outside 2SD, different side
    bool   Rule4_1s,      // Reject: 4 consecutive outside 1SD, same side
    bool   Rule10x,       // Reject: N consecutive same side of mean
    bool   Rule7T,        // Reject: 7 consecutive trend, same direction
    double RejectSD,      // SD multiplier for the 1:Ns reject rule (default 3)
    int    NxCount        // N for the "N consecutive same side" rule (default 10)
);

public interface IWestgardService
{
    /// <summary>Evaluate a NEW value against the in-control history of this sample+parameter,
    /// applying the sample's enabled within-material rules.</summary>
    Task<WestgardResult> EvaluateAsync(
        Guid              qcSampleId,
        Guid              testFileParameterId,
        double            newValue,
        double            mean,
        double            sd,
        WestgardRuleSet   rules,
        Guid?             excludeResultId = null,
        CancellationToken ct = default);
}
