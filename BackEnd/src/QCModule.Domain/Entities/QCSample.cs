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

    // Westgard rules per sample
    public bool Rule1_2s { get; set; } = true;
    public bool Rule1_3s { get; set; } = true;
    public bool Rule3_1s { get; set; } = false;
    public bool Rule2_2s { get; set; } = false;
    public bool RuleR_4s { get; set; } = false;
    public bool Rule4_1s { get; set; } = false;
    public bool Rule9x   { get; set; } = false;
    public bool Rule10x  { get; set; } = false;

    public ICollection<QCSampleTarget> Targets   { get; set; } = new List<QCSampleTarget>();
    public ICollection<QCResult>       QCResults { get; set; } = new List<QCResult>();
}
