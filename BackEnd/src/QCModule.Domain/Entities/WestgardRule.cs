namespace QCModule.Domain.Entities;

public class WestgardRule : BaseEntity
{
    public string RuleCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsWarning { get; set; }
    public bool IsRejection { get; set; }
    public bool IsEnabled { get; set; } = true;
}
