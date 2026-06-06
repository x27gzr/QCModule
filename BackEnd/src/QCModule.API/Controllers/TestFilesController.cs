using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Authorization;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.Commands.CreateTestFile;
using QCModule.Application.Features.TestFiles.Commands.DeleteTestFile;
using QCModule.Application.Features.TestFiles.Commands.ManageParameter;
using QCModule.Application.Features.TestFiles.Commands.UpdateTestFile;
using QCModule.Application.Features.TestFiles.DTOs;
using QCModule.Application.Features.TestFiles.Queries.GetTestFileById;
using QCModule.Application.Features.TestFiles.Queries.GetTestFiles;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/testfiles")]
public class TestFilesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = Permissions.Instruments.View)]
    public async Task<ActionResult<Result<PaginatedResult<TestFileSummaryDto>>>> GetAll(
        [FromQuery] string? search, [FromQuery] bool? isActive,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetTestFilesQuery(search, isActive, page, pageSize), ct));

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.Instruments.View)]
    public async Task<ActionResult<Result<TestFileDto>>> GetById(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTestFileByIdQuery(id), ct));

    [HttpPost]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<ActionResult<Result<TestFileDto>>> Create([FromBody] CreateTestFileCommand cmd, CancellationToken ct)
    {
        var result = await mediator.Send(cmd, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<ActionResult<Result<TestFileDto>>> Update(Guid id, [FromBody] UpdateTestFileCommand cmd, CancellationToken ct)
        => Ok(await mediator.Send(cmd with { Id = id }, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteTestFileCommand(id), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/parameters")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<ActionResult<Result<TestFileParameterDto>>> AddParameter(
        Guid id, [FromBody] AddParameterRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new AddParameterCommand(
            id, body.ParameterName, body.TestCode, body.OutputMask, body.Sequence,
            body.Unit, body.LowerLimit, body.UpperLimit), ct));

    [HttpPut("{id:guid}/parameters/{parameterId:guid}")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<ActionResult<Result<TestFileParameterDto>>> UpdateParameter(
        Guid id, Guid parameterId, [FromBody] AddParameterRequest body, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateParameterCommand(
            parameterId, id, body.ParameterName, body.TestCode, body.OutputMask, body.Sequence,
            body.Unit, body.LowerLimit, body.UpperLimit), ct));

    [HttpDelete("{id:guid}/parameters/{parameterId:guid}")]
    [Authorize(Policy = Permissions.Instruments.Manage)]
    public async Task<IActionResult> DeleteParameter(Guid id, Guid parameterId, CancellationToken ct)
    {
        await mediator.Send(new DeleteParameterCommand(parameterId), ct);
        return NoContent();
    }
}

public record AddParameterRequest(
    string  ParameterName,
    string? TestCode,
    string? OutputMask,
    int     Sequence,
    string? Unit,
    double? LowerLimit,
    double? UpperLimit
);
