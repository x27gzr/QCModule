using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.Commands.AuthoriseQCResult;
using QCModule.Application.Features.QCResults.Commands.CreateQCResult;
using QCModule.Application.Features.QCResults.Commands.ValidateQCResult;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Application.Features.QCResults.Queries.GetAuthorisationSummary;
using QCModule.Application.Features.QCResults.Queries.GetLeveyJennings;
using QCModule.Application.Features.QCResults.Queries.GetQCResults;
using QCModule.Domain.Enums;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/qcresults")]
public class QCResultsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.QCResults.View)]
    public async Task<ActionResult<Result<PaginatedResult<QCResultSummaryDto>>>> GetAll(
        [FromQuery] Guid?                qcSampleId,
        [FromQuery] Guid?                testFileParameterId,
        [FromQuery] Guid?                instrumentId,
        [FromQuery] QCStatus?            status,
        [FromQuery] ValidationStatus?    validationStatus,
        [FromQuery] AuthorisationStatus? authorisationStatus,
        [FromQuery] DateTime?            dateFrom,
        [FromQuery] DateTime?            dateTo,
        [FromQuery] bool                 includeDeleted = false,
        [FromQuery] int                  page           = 1,
        [FromQuery] int                  pageSize       = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetQCResultsQuery(
            qcSampleId, testFileParameterId, instrumentId, status, validationStatus, authorisationStatus,
            dateFrom, dateTo, includeDeleted, page, pageSize), ct));

    [HttpPost]
    [Authorize(Policy = Permissions.QCResults.Create)]
    public async Task<ActionResult<Result<QCResultDto>>> Create(
        [FromBody] CreateQCResultCommand cmd, CancellationToken ct)
        => Ok(await mediator.Send(cmd, ct));

    // ── Stage 1: Analyst validation ───────────────────────────────────────────
    [HttpPost("{id:guid}/validate")]
    [Authorize(Policy = Permissions.QCResults.Validate)]
    public async Task<ActionResult<Result<bool>>> Validate(
        Guid id, [FromBody] ValidateRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new ValidateQCResultCommand(id, body.Reject, body.Note), ct));

    [HttpPost("{id:guid}/cancel-validation")]
    [Authorize(Policy = Permissions.QCResults.Validate)]
    public async Task<ActionResult<Result<bool>>> CancelValidation(
        Guid id, [FromBody] ReasonRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new CancelValidationCommand(id, body.Reason), ct));

    // ── Stage 2: Doctor authorisation ─────────────────────────────────────────
    [HttpPost("{id:guid}/doctor-authorise")]
    [Authorize(Policy = Permissions.QCResults.Authorise)]
    public async Task<ActionResult<Result<bool>>> DoctorAuthorise(
        Guid id, [FromBody] NoteRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new AuthoriseQCResultCommand(id, body.Note), ct));

    [HttpPost("{id:guid}/doctor-cancel-authorisation")]
    [Authorize(Policy = Permissions.QCResults.Authorise)]
    public async Task<ActionResult<Result<bool>>> DoctorCancelAuthorisation(
        Guid id, [FromBody] ReasonRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new CancelAuthorisationCommand(id, body.Reason), ct));

    [HttpPost("batch-doctor-authorise")]
    [Authorize(Policy = Permissions.QCResults.Authorise)]
    public async Task<ActionResult<Result<BatchAuthoriseResult>>> BatchAuthorise(
        [FromBody] BatchAuthoriseRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new BatchAuthoriseCommand(body.ResultIds, body.Note), ct));

    [HttpGet("pending-doctor-authorisation")]
    [Authorize(Policy = Permissions.QCResults.Authorise)]
    public async Task<ActionResult<Result<PaginatedResult<QCResultSummaryDto>>>> PendingAuthorisation(
        [FromQuery] Guid?     qcSampleId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int       page     = 1,
        [FromQuery] int       pageSize = 50,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetQCResultsQuery(
            QCSampleId: qcSampleId,
            ValidationStatus: ValidationStatus.Validated,
            AuthorisationStatus: AuthorisationStatus.Pending,
            DateFrom: dateFrom, DateTo: dateTo, Page: page, PageSize: pageSize), ct));

    [HttpGet("doctor-authorisation-summary")]
    [Authorize(Policy = Permissions.QCResults.Authorise)]
    public async Task<ActionResult<Result<AuthorisationSummaryDto>>> AuthorisationSummary(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetAuthorisationSummaryQuery(dateFrom, dateTo), ct));

    // ── Reports ───────────────────────────────────────────────────────────────
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

public record ValidateRequest(bool Reject, string? Note);
public record NoteRequest(string? Note);
public record ReasonRequest(string Reason);
public record BatchAuthoriseRequest(IReadOnlyList<Guid> ResultIds, string? Note);
