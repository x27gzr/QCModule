using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.Commands.CreateInstrument;
using QCModule.Application.Features.Instruments.Commands.DeleteInstrument;
using QCModule.Application.Features.Instruments.Commands.ToggleInstrumentActive;
using QCModule.Application.Features.Instruments.Commands.UpdateInstrument;
using QCModule.Application.Features.Instruments.DTOs;
using QCModule.Application.Features.Instruments.Queries.GetInstrumentById;
using QCModule.Application.Features.Instruments.Queries.GetInstruments;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/instruments")]
public class InstrumentsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.Instruments.View)]
    public async Task<ActionResult<Result<PaginatedResult<InstrumentSummaryDto>>>> GetInstruments(
        [FromQuery] string? search,
        [FromQuery] bool?   isActive,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetInstrumentsQuery(search, isActive, page, pageSize), ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.Instruments.View)]
    public async Task<ActionResult<Result<InstrumentDto>>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetInstrumentByIdQuery(id), ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<ActionResult<Result<InstrumentDto>>> Create(
        [FromBody] CreateInstrumentCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<ActionResult<Result<InstrumentDto>>> Update(
        Guid id, [FromBody] UpdateInstrumentCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command with { Id = id }, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteInstrumentCommand(id), ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/active")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<ActionResult<Result<bool>>> ToggleActive(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new ToggleInstrumentActiveCommand(id), ct);
        return Ok(result);
    }
}
