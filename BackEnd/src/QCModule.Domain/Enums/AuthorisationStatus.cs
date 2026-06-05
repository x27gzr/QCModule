namespace QCModule.Domain.Enums;

/// <summary>Doctor-level authorisation of a QC result. Requires analyst validation first.</summary>
public enum AuthorisationStatus
{
    Pending    = 0,
    Authorised = 1,
    Rejected   = 2
}
