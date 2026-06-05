using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.Commands.ChangePassword;
using QCModule.Application.Features.Users.Commands.CreateUser;
using QCModule.Application.Features.Users.Commands.DeleteUser;
using QCModule.Application.Features.Users.Commands.ToggleUserActive;
using QCModule.Application.Features.Users.Commands.UpdateUser;
using QCModule.Application.Features.Users.DTOs;
using QCModule.Application.Features.Users.Queries.GetUserById;
using QCModule.Application.Features.Users.Queries.GetUsers;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(IMediator mediator, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.Users.View)]
    public async Task<ActionResult<Result<PaginatedResult<UserSummaryDto>>>> GetUsers(
        [FromQuery] string? search,
        [FromQuery] Guid?   roleId,
        [FromQuery] bool?   isActive,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(
            new GetUsersQuery(search, roleId, isActive, page, pageSize), ct);
        return Ok(result);
    }

    [HttpGet("me")]
    public async Task<ActionResult<Result<UserDto>>> GetCurrentUser(CancellationToken ct)
    {
        var userId = currentUser.UserId
            ?? throw new UnauthorizedAccessException();

        var result = await mediator.Send(new GetUserByIdQuery(userId), ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.Users.View)]
    public async Task<ActionResult<Result<UserDto>>> GetUserById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetUserByIdQuery(id), ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.Users.Manage)]
    public async Task<ActionResult<Result<UserDto>>> CreateUser(
        [FromBody] CreateUserCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(
            nameof(GetUserById),
            new { id = result.Data!.Id },
            result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.Users.Manage)]
    public async Task<ActionResult<Result<UserDto>>> UpdateUser(
        Guid id,
        [FromBody] UpdateUserCommand command,
        CancellationToken ct)
    {
        var result = await mediator.Send(command with { Id = id }, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.Users.Manage)]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteUserCommand(id, currentUser.UserId!.Value), ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/active")]
    [Authorize(Policy = Permissions.Users.Manage)]
    public async Task<ActionResult<Result<bool>>> ToggleActive(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(
            new ToggleUserActiveCommand(id, currentUser.UserId!.Value), ct);
        return Ok(result);
    }

    [HttpPut("{id:guid}/password")]
    public async Task<IActionResult> ChangePassword(
        Guid id,
        [FromBody] ChangePasswordRequest body,
        CancellationToken ct)
    {
        await mediator.Send(new ChangePasswordCommand(
            TargetUserId:        id,
            RequestingUserId:    currentUser.UserId!.Value,
            RequestingUserRole:  currentUser.Role ?? string.Empty,
            CurrentPassword:     body.CurrentPassword,
            NewPassword:         body.NewPassword,
            ConfirmPassword:     body.ConfirmPassword), ct);

        return NoContent();
    }
}

public record ChangePasswordRequest(
    string? CurrentPassword,
    string  NewPassword,
    string  ConfirmPassword
);
