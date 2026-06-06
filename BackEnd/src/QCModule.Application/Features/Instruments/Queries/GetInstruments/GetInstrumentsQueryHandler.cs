using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Queries.GetInstruments;

public class GetInstrumentsQueryHandler(IRepository<Instrument> repo, IRepository<TestFile> testFileRepo)
    : IRequestHandler<GetInstrumentsQuery, Result<PaginatedResult<InstrumentSummaryDto>>>
{
    public async Task<Result<PaginatedResult<InstrumentSummaryDto>>> Handle(
        GetInstrumentsQuery request, CancellationToken cancellationToken)
    {
        var all        = await repo.GetAllAsync(cancellationToken);
        var testFiles  = (await testFileRepo.GetAllAsync(cancellationToken)).ToDictionary(t => t.Id, t => t.Name);
        var query      = all.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(i => i.Name.ToLower().Contains(term)
                                  || i.Code.ToLower().Contains(term));
        }

        if (request.IsActive.HasValue)
            query = query.Where(i => i.IsActive == request.IsActive.Value);

        var ordered  = query.OrderBy(i => i.Name).ToList();
        var total    = ordered.Count;
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var page     = Math.Max(request.Page, 1);

        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new InstrumentSummaryDto(
                i.Id, i.Name, i.Code, i.IsActive,
                i.TestFileId,
                testFiles.TryGetValue(i.TestFileId, out var tfName) ? tfName : "—"))
            .ToList();

        return Result<PaginatedResult<InstrumentSummaryDto>>.Success(new PaginatedResult<InstrumentSummaryDto>
        {
            Items      = items,
            TotalCount = total,
            PageNumber = page,
            PageSize   = pageSize
        });
    }
}
