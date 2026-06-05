namespace QCModule.Domain.Entities;

public class Instrument : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<QCSample> QCSamples { get; set; } = new List<QCSample>();
}
