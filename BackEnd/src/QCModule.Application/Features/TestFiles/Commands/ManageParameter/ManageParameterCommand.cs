using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Commands.ManageParameter;

public record AddParameterCommand(
    Guid    TestFileId,
    string  ParameterName,
    string? Unit,
    double? LowerLimit,
    double? UpperLimit
) : IRequest<Result<TestFileParameterDto>>;

public record UpdateParameterCommand(
    Guid    ParameterId,
    Guid    TestFileId,
    string  ParameterName,
    string? Unit,
    double? LowerLimit,
    double? UpperLimit
) : IRequest<Result<TestFileParameterDto>>;

public record DeleteParameterCommand(Guid ParameterId) : IRequest;
