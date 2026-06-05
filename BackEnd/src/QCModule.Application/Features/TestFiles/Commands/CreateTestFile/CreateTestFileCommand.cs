using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Commands.CreateTestFile;

public record CreateTestFileCommand(
    string  Name,
    string  Code,
    string? Unit,
    string? Category
) : IRequest<Result<TestFileDto>>;
