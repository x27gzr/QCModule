using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Commands.CreateTestFile;

public record CreateTestFileCommand(
    string  Name,
    string  Code,
    string  Type,
    string? Unit,
    IEnumerable<ParameterInput> Parameters
) : IRequest<Result<TestFileDto>>;
