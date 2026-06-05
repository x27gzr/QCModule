using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.Commands.CreateQCResult;
using QCModule.Application.Features.QCResults.Commands.ReviewQCResult;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Application.Features.QCResults.Queries.GetQCResults;
using QCModule.Application.Features.QCResults.Queries.GetLeveyJennings;
using QCModule.Domain.Enums;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/qcresults")]
public class QCResultsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.QCResults.Create)]
    public async Task<ActionResult<Result<PaginatedResult<QCResultSummaryDto>>>> GetAll(
        [FromQuery] Guid?     qcSampleId,
        [FromQuery] Guid?     testFileParameterId,
        [FromQuery] QCStatus? status,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int       page     = 1,
        [FromQuery] int       pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(
            new GetQCResultsQuery(qcSampleId, testFileParameterId, status, dateFrom, dateTo, page, pageSize), ct));

    [HttpPost]
    [Authorize(Policy = Permissions.QCResults.Create)]
    public async Task<ActionResult<Result<QCResultDto>>> Create(
        [FromBody] CreateQCResultCommand cmd, CancellationToken ct)
        => Ok(await mediator.Send(cmd, ct));

    [HttpPatch("{id:guid}/review")]
    [Authorize(Policy = Permissions.QCResults.Review)]
    public async Task<ActionResult<Result<bool>>> Review(
        Guid id, [FromBody] ReviewRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new ReviewQCResultCommand(id, body.NewStatus, body.Comment), ct));

    [HttpGet("levey-jennings")]
    [Authorize(Policy = Permissions.Reports.View)]
    public async Task<ActionResult<Result<LeveyJenningsDto>>> LeveyJennings(
        [FromQuery] Guid      qcSampleId,
        [FromQuery] Guid      testFileParameterId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        CancellationToken ct = default)
        => Ok(await mediator.Send(
            new GetLeveyJenningsQuery(qcSampleId, testFileParameterId, dateFrom, dateTo), ct));
}

public record ReviewRequest(QCStatus NewStatus, string? Comment);
