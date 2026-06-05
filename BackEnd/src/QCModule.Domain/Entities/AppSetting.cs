namespace QCModule.Domain.Entities;

/// <summary>Generic key/value application setting store.</summary>
public class AppSetting : BaseEntity
{
    public string  Key   { get; set; } = string.Empty;
    public string? Value { get; set; }
}
