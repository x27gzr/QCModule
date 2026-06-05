namespace QCModule.Domain.Enums;

/// <summary>Analyst-level technical validation of a QC result.</summary>
public enum ValidationStatus
{
    Pending   = 0,
    Validated = 1,
    Rejected  = 2
}
