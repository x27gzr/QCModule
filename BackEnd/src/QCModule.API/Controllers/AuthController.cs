using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Auth.Commands.Login;
using QCModule.Application.Features.Auth.Commands.Logout;
using QCModule.Application.Features.Auth.Commands.Refresh;
using QCModule.Application.Features.Auth.DTOs;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IMediator mediator, IConfiguration configuration) : ControllerBase
{
    private const string RefreshTokenCookie = "refreshToken";

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<Result<AuthResponse>>> Login(
        [FromBody] LoginCommand command,
        CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        SetRefreshTokenCookie(result.Data!.RawRefreshToken);
        return Ok(Result<AuthResponse>.Success(result.Data.Response, "Login successful."));
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<Result<AuthResponse>>> Refresh(CancellationToken ct)
    {
        var token = Request.Cookies[RefreshTokenCookie];
        if (string.IsNullOrWhiteSpace(token))
            return Unauthorized(new { succeeded = false, message = "No refresh token found. Please log in again." });

        var result = await mediator.Send(new RefreshCommand(token), ct);
        SetRefreshTokenCookie(result.Data!.RawRefreshToken);
        return Ok(Result<AuthResponse>.Success(result.Data.Response));
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var token = Request.Cookies[RefreshTokenCookie];
        if (!string.IsNullOrWhiteSpace(token))
            await mediator.Send(new LogoutCommand(token), ct);

        ClearRefreshTokenCookie();
        return NoContent();
    }

    private void SetRefreshTokenCookie(string token)
    {
        var expiryDays = int.Parse(configuration["Jwt:RefreshTokenExpiryDays"] ?? "7");
        Response.Cookies.Append(RefreshTokenCookie, token, new CookieOptions
        {
            HttpOnly  = true,
            Secure    = true,
            SameSite  = SameSiteMode.Strict,
            Expires   = DateTimeOffset.UtcNow.AddDays(expiryDays),
            Path      = "/api/auth"
        });
    }

    private void ClearRefreshTokenCookie() =>
        Response.Cookies.Append(RefreshTokenCookie, string.Empty, new CookieOptions
        {
            HttpOnly  = true,
            Secure    = true,
            SameSite  = SameSiteMode.Strict,
            Expires   = DateTimeOffset.UtcNow.AddDays(-1),
            Path      = "/api/auth"
        });
}
