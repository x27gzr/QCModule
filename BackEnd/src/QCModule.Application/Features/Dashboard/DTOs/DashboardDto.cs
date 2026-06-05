using QCModule.Domain.Enums;

namespace QCModule.Application.Features.Dashboard.DTOs;

public record DashboardStatsDto(
    int PendingValidation,
    int PendingAuthorise,
    int AuthorisedToday,
    int WestgardViolations   // last 7 days
);

public record RecentActivityDto(
    Guid                Id,
    string              UserName,
    string              Action,         // "Authorised" | "Validated" | "Entered"
    string              ParameterName,
    string              SampleName,
    double              Value,
    string?             Flag,
    ValidationStatus    ValidationStatus,
    AuthorisationStatus AuthorisationStatus,
    DateTime            ActivityTime
);
