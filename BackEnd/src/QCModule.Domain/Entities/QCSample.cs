namespace QCModule.Domain.Entities;

public class QCSample : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string LotNumber { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public Guid InstrumentId { get; set; }
    public Instrument Instrument { get; set; } = null!;

    public ICollection<QCSampleTarget> Targets { get; set; } = new List<QCSampleTarget>();
    public ICollection<QCResult> QCResults { get; set; } = new List<QCResult>();
}
