using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Commands.RestoreQCResult;

public class RestoreQCResultCommandHandler(
    IRepository<QCResult> repo,
    IUnitOfWork           unitOfWork)
    : IRequestHandler<RestoreQCResultCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(RestoreQCResultCommand request, CancellationToken cancellationToken)
    {
        // Must query including deleted records
        var all    = await repo.GetAllIncludingDeletedAsync(cancellationToken);
        var result = all.FirstOrDefault(r => r.Id == request.Id)
            ?? throw new NotFoundException("QC Result", request.Id);

        result.DeletedReason = null;
        await repo.RestoreAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, "QC result restored.");
    }
}
