namespace QCModule.Domain.Entities;

public class TestFileParameter : BaseEntity
{
    public Guid TestFileId { get; set; }
    public TestFile TestFile { get; set; } = null!;
    public string ParameterName { get; set; } = string.Empty;
    public string? TestCode { get; set; }
    public string? OutputMask { get; set; }
    public int Sequence { get; set; } = 0;
    public string? Unit { get; set; }
    public double? LowerLimit { get; set; }
    public double? UpperLimit { get; set; }

    public ICollection<QCSampleTarget> QCSampleTargets { get; set; } = new List<QCSampleTarget>();
    public ICollection<QCResult> QCResults { get; set; } = new List<QCResult>();
}
