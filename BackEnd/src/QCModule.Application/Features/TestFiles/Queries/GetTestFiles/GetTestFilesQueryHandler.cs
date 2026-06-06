using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.TestFiles.Queries.GetTestFiles;

public class GetTestFilesQueryHandler(
    IRepository<TestFile>          testFileRepo,
    IRepository<TestFileParameter> paramRepo)
    : IRequestHandler<GetTestFilesQuery, Result<PaginatedResult<TestFileSummaryDto>>>
{
    public async Task<Result<PaginatedResult<TestFileSummaryDto>>> Handle(
        GetTestFilesQuery request, CancellationToken cancellationToken)
    {
        var files   = await testFileRepo.GetAllAsync(cancellationToken);
        var params_ = await paramRepo.GetAllAsync(cancellationToken);
        var countMap = params_.GroupBy(p => p.TestFileId)
                               .ToDictionary(g => g.Key, g => g.Count());

        var query = files.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(f => f.Name.ToLower().Contains(term)
                                  || f.Code.ToLower().Contains(term)
                                  || f.Type.ToLower().Contains(term));
        }
        if (request.IsActive.HasValue)
            query = query.Where(f => f.IsActive == request.IsActive.Value);

        var ordered  = query.OrderBy(f => f.Name).ToList();
        var total    = ordered.Count;
        var pageSize = Math.Clamp(request.PageSize, 1, 200);
        var page     = Math.Max(request.Page, 1);

        var items = ordered
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(f => new TestFileSummaryDto(
                f.Id, f.Name, f.Code, f.Type, f.IsActive,
                countMap.GetValueOrDefault(f.Id, 0)))
            .ToList();

        return Result<PaginatedResult<TestFileSummaryDto>>.Success(new PaginatedResult<TestFileSummaryDto>
        {
            Items = items, TotalCount = total, PageNumber = page, PageSize = pageSize
        });
    }
}
