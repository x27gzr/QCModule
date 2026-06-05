using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;

namespace QCModule.Application.Features.QCResults.Queries.GetAuthorisationSummary;

public record GetAuthorisationSummaryQuery(
    DateTime? DateFrom = null,
    DateTime? DateTo   = null
) : IRequest<Result<AuthorisationSummaryDto>>;
