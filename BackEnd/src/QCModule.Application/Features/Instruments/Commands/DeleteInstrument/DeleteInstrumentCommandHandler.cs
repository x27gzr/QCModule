using MediatR;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Commands.DeleteInstrument;

public class DeleteInstrumentCommandHandler(IRepository<Instrument> repo, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteInstrumentCommand>
{
    public async Task Handle(DeleteInstrumentCommand request, CancellationToken cancellationToken)
    {
        var items = await repo.FindAsync(i => i.Id == request.Id, cancellationToken);
        var item  = items.FirstOrDefault()
            ?? throw new NotFoundException("Instrument", request.Id);

        await repo.DeleteAsync(item, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
