using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Commands.UpdateTestFile;

public record UpdateTestFileCommand(
    Guid   Id,
    string Name,
    string Code,
    string Type,
    string? Unit,
    IEnumerable<ParameterInput> Parameters
) : IRequest<Result<TestFileDto>>;
