using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Queries.GetInstrumentById;

public class GetInstrumentByIdQueryHandler(IRepository<Instrument> repo)
    : IRequestHandler<GetInstrumentByIdQuery, Result<InstrumentDto>>
{
    public async Task<Result<InstrumentDto>> Handle(GetInstrumentByIdQuery request, CancellationToken cancellationToken)
    {
        var items = await repo.FindAsync(i => i.Id == request.Id, cancellationToken);
        var item  = items.FirstOrDefault()
            ?? throw new NotFoundException("Instrument", request.Id);

        return Result<InstrumentDto>.Success(new InstrumentDto(
            item.Id, item.Name, item.Code, item.Manufacturer,
            item.Model, item.SerialNumber, item.IsActive, item.CreatedAt));
    }
}
