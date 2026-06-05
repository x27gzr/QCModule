using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;

namespace QCModule.Application.Features.Instruments.Queries.GetInstruments;

public record GetInstrumentsQuery(
    string? Search   = null,
    bool?   IsActive = null,
    int     Page     = 1,
    int     PageSize = 10
) : IRequest<Result<PaginatedResult<InstrumentSummaryDto>>>;
