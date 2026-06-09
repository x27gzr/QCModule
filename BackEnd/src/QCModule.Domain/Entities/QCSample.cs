namespace QCModule.Domain.Entities;

public class QCSample : BaseEntity
{
    public string   Name       { get; set; } = string.Empty;
    public string   LotNumber  { get; set; } = string.Empty;
    public string   Level      { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public bool     IsActive   { get; set; } = true;
    public Guid     InstrumentId { get; set; }
    public Instrument Instrument { get; set; } = null!;

    // ── Westgard rules per sample ─────────────────────────────────────────────
    // Within-material rules (evaluated on this level's own time series)
    public bool Rule1_2s     { get; set; } = true;   // Warning: outside 2SD
    public bool Rule1_3s     { get; set; } = true;   // Reject: outside N SD
    public bool Rule2_2s     { get; set; } = false;  // Reject: 2 consec outside 2SD, same side
    public bool Rule2_2sDiff { get; set; } = false;  // Reject: 2 consec outside 2SD, different side
    public bool Rule4_1s     { get; set; } = false;  // Reject: 4 consec outside 1SD, same side
    public bool Rule10x      { get; set; } = false;  // Reject: N consec same side of mean
    public bool Rule7T       { get; set; } = false;  // Reject: 7 consec trend same direction
    // Configurable thresholds
    public double RejectSD   { get; set; } = 3.0;    // SD multiplier for the 1:Ns reject rule
    public int    NxCount    { get; set; } = 10;     // N for the "N consecutive same side" rule

    // Legacy / Phase-2 (across-material) — kept for compatibility, not used in within-material eval
    public bool Rule3_1s { get; set; } = false;
    public bool RuleR_4s { get; set; } = false;
    public bool Rule9x   { get; set; } = false;

    public ICollection<QCSampleTarget> Targets   { get; set; } = new List<QCSampleTarget>();
    public ICollection<QCResult>       QCResults { get; set; } = new List<QCResult>();
}
