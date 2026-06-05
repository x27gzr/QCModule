using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.Commands.CreateQCSample;
using QCModule.Application.Features.QCSamples.Commands.DeleteQCSample;
using QCModule.Application.Features.QCSamples.Commands.UpdateQCSample;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Application.Features.QCSamples.Queries.GetQCSampleById;
using QCModule.Application.Features.QCSamples.Queries.GetQCSamples;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/qcsamples")]
public class QCSamplesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.QCSamples.View)]
    public async Task<ActionResult<Result<PaginatedResult<QCSampleSummaryDto>>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] Guid?   instrumentId,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetQCSamplesQuery(search, instrumentId, page, pageSize), ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.QCSamples.View)]
    public async Task<ActionResult<Result<QCSampleDto>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetQCSampleByIdQuery(id), ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<ActionResult<Result<QCSampleDto>>> Create(
        [FromBody] CreateQCSampleCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<ActionResult<Result<QCSampleDto>>> Update(
        Guid id, [FromBody] UpdateQCSampleCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command with { Id = id }, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteQCSampleCommand(id), ct);
        return NoContent();
    }
}
