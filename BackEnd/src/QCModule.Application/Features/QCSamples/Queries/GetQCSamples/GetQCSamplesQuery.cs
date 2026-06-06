using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;

namespace QCModule.Application.Features.QCSamples.Queries.GetQCSamples;

public record GetQCSamplesQuery(
    string? Search       = null,
    Guid?   InstrumentId = null,
    bool?   IsActive     = null,
    int     Page         = 1,
    int     PageSize     = 10
) : IRequest<Result<PaginatedResult<QCSampleSummaryDto>>>;
