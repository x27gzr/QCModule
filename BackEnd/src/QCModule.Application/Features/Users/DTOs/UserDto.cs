namespace QCModule.Application.Features.Users.DTOs;

public record UserDto(
    Guid      Id,
    string    Name,
    string?   Nickname,
    string    Email,
    string    Role,
    bool      IsActive,
    DateTime? LastLoginAt,
    DateTime  CreatedAt
);

public record UserSummaryDto(
    Guid    Id,
    string  Name,
    string? Nickname,
    string  Email,
    string  Role,
    bool    IsActive
);
