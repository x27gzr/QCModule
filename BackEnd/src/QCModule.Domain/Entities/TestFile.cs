namespace QCModule.Domain.Entities;

public class TestFile : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? Category { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<TestFileParameter> Parameters { get; set; } = new List<TestFileParameter>();
}
