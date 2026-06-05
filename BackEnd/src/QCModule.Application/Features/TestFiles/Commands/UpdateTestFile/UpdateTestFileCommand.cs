using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Commands.UpdateTestFile;

public record UpdateTestFileCommand(Guid Id, string Name, string Code, string? Unit, string? Category)
    : IRequest<Result<TestFileDto>>;
