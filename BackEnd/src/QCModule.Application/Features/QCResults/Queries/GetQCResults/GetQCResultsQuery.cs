using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Domain.Enums;

namespace QCModule.Application.Features.QCResults.Queries.GetQCResults;

public record GetQCResultsQuery(
    Guid?      QCSampleId          = null,
    Guid?      TestFileParameterId = null,
    QCStatus?  Status              = null,
    DateTime?  DateFrom            = null,
    DateTime?  DateTo              = null,
    int        Page                = 1,
    int        PageSize            = 20
) : IRequest<Result<PaginatedResult<QCResultSummaryDto>>>;
