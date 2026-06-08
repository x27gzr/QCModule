using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.Commands.CreateQCSample;
using QCModule.Application.Features.QCSamples.Commands.DeleteQCSample;
using QCModule.Application.Features.QCSamples.Commands.EstablishMean;
using QCModule.Application.Features.QCSamples.Commands.UpdateQCSample;
using QCModule.Application.Features.QCSamples.Commands.UpsertTarget;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Application.Features.QCSamples.Queries.GetEstablishPreview;
using QCModule.Application.Features.QCSamples.Queries.GetQCSampleById;
using QCModule.Application.Features.QCSamples.Queries.GetQCSamples;
using QCModule.Application.Features.QCSamples.Queries.GetQCSampleTargets;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/qcsamples")]
public class QCSamplesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.QCSamples.View)]
    public async Task<ActionResult<Result<PaginatedResult<QCSampleSummaryDto>>>> GetAll(
        [FromQuery] string? search, [FromQuery] Guid? instrumentId, [FromQuery] bool? isActive,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetQCSamplesQuery(search, instrumentId, isActive, page, pageSize), ct));

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.QCSamples.View)]
    public async Task<ActionResult<Result<QCSampleDto>>> GetById(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetQCSampleByIdQuery(id), ct));

    [HttpPost]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<ActionResult<Result<QCSampleDto>>> Create([FromBody] CreateQCSampleCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<ActionResult<Result<QCSampleDto>>> Update(Guid id, [FromBody] UpdateQCSampleCommand command, CancellationToken ct)
        => Ok(await mediator.Send(command with { Id = id }, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteQCSampleCommand(id), ct);
        return NoContent();
    }

    // ── Targets ──────────────────────────────────────────────────────────────
    [HttpGet("{id:guid}/targets")]
    [Authorize(Policy = Permissions.QCSamples.View)]
    public async Task<ActionResult<Result<IEnumerable<QCSampleTargetDto>>>> GetTargets(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetQCSampleTargetsQuery(id), ct));

    [HttpPut("{id:guid}/targets")]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<ActionResult<Result<QCSampleTargetDto>>> UpsertTarget(
        Guid id, [FromBody] UpsertTargetRequest body, CancellationToken ct)
        => Ok(await mediator.Send(
            new UpsertTargetCommand(id, body.TestFileParameterId, body.Mean, body.SD, body.CV, body.Tea, body.TeaUnit), ct));

    // ── Establish Mean (hitung Mean/SD dari data rentang → jadikan target) ────
    [HttpGet("{id:guid}/establish-preview")]
    [Authorize(Policy = Permissions.QCSamples.View)]
    public async Task<ActionResult<Result<IReadOnlyList<EstablishPreviewDto>>>> EstablishPreview(
        Guid id, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo, CancellationToken ct)
        => Ok(await mediator.Send(new GetEstablishPreviewQuery(id, dateFrom, dateTo), ct));

    [HttpPost("{id:guid}/establish")]
    [Authorize(Policy = Permissions.QCSamples.Manage)]
    public async Task<ActionResult<Result<EstablishMeanResult>>> EstablishMean(
        Guid id, [FromBody] EstablishRequest body, CancellationToken ct)
        => Ok(await mediator.Send(
            new EstablishMeanCommand(id, body.DateFrom, body.DateTo, body.TestFileParameterIds), ct));
}

public record EstablishRequest(
    DateTime?           DateFrom,
    DateTime?           DateTo,
    IReadOnlyList<Guid> TestFileParameterIds
);

public record UpsertTargetRequest(
    Guid    TestFileParameterId,
    double  Mean,
    double  SD,
    double  CV,
    double? Tea,
    string? TeaUnit
);
