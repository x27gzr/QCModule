using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;

namespace QCModule.Application.Features.TestFiles.Queries.GetTestFiles;

public record GetTestFilesQuery(
    string? Search   = null,
    bool?   IsActive = null,
    int     Page     = 1,
    int     PageSize = 10
) : IRequest<Result<PaginatedResult<TestFileSummaryDto>>>;
