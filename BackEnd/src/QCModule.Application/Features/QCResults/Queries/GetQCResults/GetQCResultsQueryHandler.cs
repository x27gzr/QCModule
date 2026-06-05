using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Queries.GetQCResults;

public class GetQCResultsQueryHandler(
    IRepository<QCResult>          resultRepo,
    IRepository<QCSample>          sampleRepo,
    IRepository<TestFileParameter> paramRepo)
    : IRequestHandler<GetQCResultsQuery, Result<PaginatedResult<QCResultSummaryDto>>>
{
    public async Task<Result<PaginatedResult<QCResultSummaryDto>>> Handle(
        GetQCResultsQuery request, CancellationToken cancellationToken)
    {
        var results = await resultRepo.GetAllAsync(cancellationToken);
        var samples = await sampleRepo.GetAllAsync(cancellationToken);
        var params_ = await paramRepo.GetAllAsync(cancellationToken);

        var sampleMap = samples.ToDictionary(s => s.Id);
        var paramMap  = params_.ToDictionary(p => p.Id);

        var query = results.AsEnumerable();

        if (request.QCSampleId.HasValue)          query = query.Where(r => r.QCSampleId == request.QCSampleId.Value);
        if (request.TestFileParameterId.HasValue)  query = query.Where(r => r.TestFileParameterId == request.TestFileParameterId.Value);
        if (request.Status.HasValue)               query = query.Where(r => r.Status == request.Status.Value);
        if (request.DateFrom.HasValue)             query = query.Where(r => r.ResultDate >= request.DateFrom.Value);
        if (request.DateTo.HasValue)               query = query.Where(r => r.ResultDate <= request.DateTo.Value);

        var ordered  = query.OrderByDescending(r => r.ResultDate).ToList();
        var total    = ordered.Count;
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var page     = Math.Max(request.Page, 1);

        var items = ordered
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r =>
            {
                sampleMap.TryGetValue(r.QCSampleId, out var s);
                paramMap.TryGetValue(r.TestFileParameterId, out var p);
                return new QCResultSummaryDto(
                    r.Id, s?.Name ?? "?", s?.Level ?? "?",
                    p?.ParameterName ?? "?", p?.Unit,
                    r.ResultDate, r.Value, r.ZScore, r.Status, r.WestgardFlags);
            }).ToList();

        return Result<PaginatedResult<QCResultSummaryDto>>.Success(new PaginatedResult<QCResultSummaryDto>
        {
            Items = items, TotalCount = total, PageNumber = page, PageSize = pageSize
        });
    }
}
