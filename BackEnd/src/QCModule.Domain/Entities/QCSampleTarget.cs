namespace QCModule.Domain.Entities;

public class QCSampleTarget : BaseEntity
{
    public Guid QCSampleId { get; set; }
    public QCSample QCSample { get; set; } = null!;
    public Guid TestFileParameterId { get; set; }
    public TestFileParameter TestFileParameter { get; set; } = null!;
    public double  Mean    { get; set; }
    public double  SD      { get; set; }
    public double  CV      { get; set; }
    public double? Tea     { get; set; }
    public string? TeaUnit { get; set; } = "%";
}
