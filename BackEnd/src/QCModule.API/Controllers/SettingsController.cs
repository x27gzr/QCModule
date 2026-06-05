using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.Commands.UpdateLoginCustomization;
using QCModule.Application.Features.Settings.DTOs;
using QCModule.Application.Features.Settings.Queries.GetLoginCustomization;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(IMediator mediator) : ControllerBase
{
    // Public — the login page needs branding before authentication.
    [AllowAnonymous]
    [HttpGet("login-customization")]
    public async Task<ActionResult<Result<LoginCustomizationDto>>> GetLoginCustomization(CancellationToken ct)
        => Ok(await mediator.Send(new GetLoginCustomizationQuery(), ct));

    [Authorize(Policy = Permissions.Settings.Manage)]
    [HttpPut("login-customization")]
    public async Task<ActionResult<Result<LoginCustomizationDto>>> UpdateLoginCustomization(
        [FromBody] UpdateLoginCustomizationCommand command, CancellationToken ct)
        => Ok(await mediator.Send(command, ct));

    [Authorize(Policy = Permissions.Settings.Manage)]
    [HttpPost("login-customization/reset")]
    public async Task<ActionResult<Result<LoginCustomizationDto>>> ResetLoginCustomization(CancellationToken ct)
        => Ok(await mediator.Send(new ResetLoginCustomizationCommand(), ct));
}
