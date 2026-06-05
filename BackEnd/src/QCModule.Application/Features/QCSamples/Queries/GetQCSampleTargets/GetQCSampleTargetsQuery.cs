using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;

namespace QCModule.Application.Features.QCSamples.Queries.GetQCSampleTargets;

public record GetQCSampleTargetsQuery(Guid QCSampleId) : IRequest<Result<IEnumerable<QCSampleTargetDto>>>;
