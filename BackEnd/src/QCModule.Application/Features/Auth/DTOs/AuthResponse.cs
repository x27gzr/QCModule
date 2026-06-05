namespace QCModule.Application.Features.Auth.DTOs;

public record AuthResponse(
    string AccessToken,
    string TokenType,
    int    ExpiresIn,
    Guid   UserId,
    string Name,
    string Email,
    string Role
);
