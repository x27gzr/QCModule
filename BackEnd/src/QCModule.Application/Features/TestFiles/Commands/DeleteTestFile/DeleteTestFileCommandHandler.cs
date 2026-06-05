using MediatR;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.TestFiles.Commands.DeleteTestFile;

public class DeleteTestFileCommandHandler(IRepository<TestFile> repo, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteTestFileCommand>
{
    public async Task Handle(DeleteTestFileCommand request, CancellationToken cancellationToken)
    {
        var items = await repo.FindAsync(f => f.Id == request.Id, cancellationToken);
        var item  = items.FirstOrDefault() ?? throw new NotFoundException("Test File", request.Id);
        await repo.DeleteAsync(item, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
