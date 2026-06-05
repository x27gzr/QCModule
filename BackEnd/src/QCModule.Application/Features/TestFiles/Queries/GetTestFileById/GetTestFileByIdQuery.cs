using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Queries.GetTestFileById;

public record GetTestFileByIdQuery(Guid Id) : IRequest<Result<TestFileDto>>;
