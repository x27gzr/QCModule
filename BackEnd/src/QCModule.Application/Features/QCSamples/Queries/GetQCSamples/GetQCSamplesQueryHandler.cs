using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Queries.GetQCSamples;

public class GetQCSamplesQueryHandler(
    IRepository<QCSample>   sampleRepo,
    IRepository<Instrument> instrumentRepo)
    : IRequestHandler<GetQCSamplesQuery, Result<PaginatedResult<QCSampleSummaryDto>>>
{
    public async Task<Result<PaginatedResult<QCSampleSummaryDto>>> Handle(
        GetQCSamplesQuery request, CancellationToken cancellationToken)
    {
        var samples     = await sampleRepo.GetAllAsync(cancellationToken);
        var instruments = await instrumentRepo.GetAllAsync(cancellationToken);
        var instrMap    = instruments.ToDictionary(i => i.Id, i => i.Name);

        var query = samples.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term)
                                  || s.LotNumber.ToLower().Contains(term)
                                  || s.Level.ToLower().Contains(term));
        }

        if (request.InstrumentId.HasValue)
            query = query.Where(s => s.InstrumentId == request.InstrumentId.Value);

        var now      = DateTime.UtcNow;
        var ordered  = query.OrderBy(s => s.ExpiryDate).ToList();
        var total    = ordered.Count;
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var page     = Math.Max(request.Page, 1);

        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new QCSampleSummaryDto(
                s.Id, s.Name, s.LotNumber, s.Level, s.ExpiryDate,
                instrMap.GetValueOrDefault(s.InstrumentId, "Unknown"),
                s.ExpiryDate < now,
                s.ExpiryDate >= now && s.ExpiryDate < now.AddDays(30)))
            .ToList();

        return Result<PaginatedResult<QCSampleSummaryDto>>.Success(new PaginatedResult<QCSampleSummaryDto>
        {
            Items = items, TotalCount = total, PageNumber = page, PageSize = pageSize
        });
    }
}
