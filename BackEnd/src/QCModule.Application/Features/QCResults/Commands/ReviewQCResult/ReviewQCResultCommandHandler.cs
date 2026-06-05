using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Commands.ReviewQCResult;

public class ReviewQCResultCommandHandler(IRepository<QCResult> repo, IUnitOfWork unitOfWork)
    : IRequestHandler<ReviewQCResultCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ReviewQCResultCommand request, CancellationToken cancellationToken)
    {
        if (request.NewStatus == QCStatus.Pending)
            throw new DomainException("Cannot set status back to Pending during review.");

        var items  = await repo.FindAsync(r => r.Id == request.Id, cancellationToken);
        var result = items.FirstOrDefault() ?? throw new NotFoundException("QC Result", request.Id);

        result.Status  = request.NewStatus;
        if (!string.IsNullOrWhiteSpace(request.Comment))
            result.Comment = request.Comment.Trim();

        await repo.UpdateAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, $"Result {request.NewStatus.ToString().ToLower()}.");
    }
}
