using System.Security.Claims;
using QCModule.Application.Common.Interfaces;

namespace QCModule.API.Middleware;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private readonly HttpContext?    _httpContext = httpContextAccessor.HttpContext;
    private readonly ClaimsPrincipal? _user        = httpContextAccessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var value = _user?.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? _user?.FindFirstValue("sub");
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? Email           => _user?.FindFirstValue(ClaimTypes.Email)
                                      ?? _user?.FindFirstValue("email");

    public string? Role            => _user?.FindFirstValue(ClaimTypes.Role);

    public string? IpAddress       => _httpContext?.Connection.RemoteIpAddress?.ToString();

    public bool    IsAuthenticated => _user?.Identity?.IsAuthenticated ?? false;
}
