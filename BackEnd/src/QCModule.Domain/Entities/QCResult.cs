using QCModule.Domain.Enums;

namespace QCModule.Domain.Entities;

public class QCResult : BaseEntity
{
    public Guid QCSampleId { get; set; }
    public QCSample QCSample { get; set; } = null!;
    public Guid TestFileParameterId { get; set; }
    public TestFileParameter TestFileParameter { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime ResultDate { get; set; }
    public double Value { get; set; }
    public double ZScore { get; set; }
    public QCStatus Status { get; set; } = QCStatus.Pending;
    public string? WestgardFlags { get; set; }
    public string? Comment { get; set; }
}
