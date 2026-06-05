namespace QCModule.Application.Features.ActivityLogs.DTOs;

public record ActivityLogDto(
    Guid     Id,
    Guid?    UserId,
    string   UserName,
    string   Action,
    string   Module,
    string?  EntityId,
    string?  Description,
    string?  IpAddress,
    DateTime CreatedAt
);

public record ActivityLogStatsDto(
    int                          Total,
    IEnumerable<CountByKeyDto>   ByAction,
    IEnumerable<CountByKeyDto>   ByModule,
    IEnumerable<CountByKeyDto>   ByUser
);

public record CountByKeyDto(string Key, int Count);
