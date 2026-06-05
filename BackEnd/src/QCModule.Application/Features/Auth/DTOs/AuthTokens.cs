namespace QCModule.Application.Features.Auth.DTOs;

// Returned from handlers to the API layer.
// The controller sets RawRefreshToken as an HttpOnly cookie and
// returns only Response in the JSON body.
public record AuthTokens(AuthResponse Response, string RawRefreshToken);
