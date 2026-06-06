namespace QCModule.Domain.Entities;

public class Instrument : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public Guid TestFileId { get; set; }
    public TestFile TestFile { get; set; } = null!;

    public ICollection<QCSample> QCSamples { get; set; } = new List<QCSample>();
}
