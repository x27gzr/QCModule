using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Commands.ManageParameter;

public record AddParameterCommand(
    Guid    TestFileId,
    string  ParameterName,
    string? TestCode,
    string? OutputMask,
    int     Sequence
) : IRequest<Result<TestFileParameterDto>>;

public record UpdateParameterCommand(
    Guid    ParameterId,
    Guid    TestFileId,
    string  ParameterName,
    string? TestCode,
    string? OutputMask,
    int     Sequence
) : IRequest<Result<TestFileParameterDto>>;

public record DeleteParameterCommand(Guid ParameterId) : IRequest;
