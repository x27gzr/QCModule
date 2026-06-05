using MediatR;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Commands.DeleteQCSample;

public class DeleteQCSampleCommandHandler(IRepository<QCSample> repo, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteQCSampleCommand>
{
    public async Task Handle(DeleteQCSampleCommand request, CancellationToken cancellationToken)
    {
        var items = await repo.FindAsync(s => s.Id == request.Id, cancellationToken);
        var item  = items.FirstOrDefault()
            ?? throw new NotFoundException("QC Sample", request.Id);

        await repo.DeleteAsync(item, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
