using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;

namespace QCModule.Application.Features.QCSamples.Queries.GetQCSampleById;

public record GetQCSampleByIdQuery(Guid Id) : IRequest<Result<QCSampleDto>>;
