using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Commands.DeleteQCResult;

public class DeleteQCResultCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork)
    : IRequestHandler<DeleteQCResultCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteQCResultCommand request, CancellationToken cancellationToken)
    {
        var items  = await repo.FindAsync(r => r.Id == request.Id, cancellationToken);
        var result = items.FirstOrDefault() ?? throw new NotFoundException("QC Result", request.Id);

        if (result.AuthorisationStatus == AuthorisationStatus.Authorised)
            throw new InvalidOperationException("Authorised results cannot be deleted.");

        result.DeletedReason = request.Reason.Trim();
        await repo.DeleteAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, "QC result deleted.");
    }
}
