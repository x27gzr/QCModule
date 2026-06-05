using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Commands.ToggleInstrumentActive;

public class ToggleInstrumentActiveCommandHandler(IRepository<Instrument> repo, IUnitOfWork unitOfWork)
    : IRequestHandler<ToggleInstrumentActiveCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ToggleInstrumentActiveCommand request, CancellationToken cancellationToken)
    {
        var items = await repo.FindAsync(i => i.Id == request.Id, cancellationToken);
        var item  = items.FirstOrDefault()
            ?? throw new NotFoundException("Instrument", request.Id);

        item.IsActive = !item.IsActive;
        await repo.UpdateAsync(item, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var status = item.IsActive ? "activated" : "deactivated";
        return Result<bool>.Success(item.IsActive, $"Instrument has been {status}.");
    }
}
