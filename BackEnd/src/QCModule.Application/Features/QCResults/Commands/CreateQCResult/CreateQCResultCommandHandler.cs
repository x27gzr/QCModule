using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Commands.CreateQCResult;

public class CreateQCResultCommandHandler(
    IRepository<QCResult>          resultRepo,
    IRepository<QCSample>          sampleRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<QCSampleTarget>    targetRepo,
    IRepository<User>              userRepo,
    IUnitOfWork                    unitOfWork,
    ICurrentUserService            currentUser,
    IWestgardService               westgard)
    : IRequestHandler<CreateQCResultCommand, Result<QCResultDto>>
{
    public async Task<Result<QCResultDto>> Handle(CreateQCResultCommand request, CancellationToken cancellationToken)
    {
        var samples = await sampleRepo.FindAsync(s => s.Id == request.QCSampleId, cancellationToken);
        var sample  = samples.FirstOrDefault() ?? throw new NotFoundException("QC Sample", request.QCSampleId);

        var params_ = await paramRepo.FindAsync(p => p.Id == request.TestFileParameterId, cancellationToken);
        var param   = params_.FirstOrDefault() ?? throw new NotFoundException("Test File Parameter", request.TestFileParameterId);

        var userId = currentUser.UserId ?? throw new UnauthorizedAccessException("User not authenticated.");
        var users  = await userRepo.FindAsync(u => u.Id == userId, cancellationToken);
        var user   = users.FirstOrDefault() ?? throw new NotFoundException("User", userId);

        // Look up QCSampleTarget for Z-score calculation
        var targets = await targetRepo.FindAsync(
            t => t.QCSampleId == request.QCSampleId && t.TestFileParameterId == request.TestFileParameterId,
            cancellationToken);
        var target = targets.FirstOrDefault();

        WestgardResult evaluation;
        if (target is not null)
            evaluation = await westgard.EvaluateAsync(request.Value, target.Mean, target.SD, cancellationToken);
        else
            evaluation = new WestgardResult(QCStatus.Pending, string.Empty, 0);

        var result = new QCResult
        {
            QCSampleId          = request.QCSampleId,
            TestFileParameterId = request.TestFileParameterId,
            UserId              = userId,
            ResultDate          = request.ResultDate.ToUniversalTime(),
            Value               = request.Value,
            ZScore              = evaluation.ZScore,
            Status              = evaluation.Status,
            WestgardFlags       = string.IsNullOrEmpty(evaluation.Flags) ? null : evaluation.Flags,
            Comment             = request.Comment?.Trim()
        };

        await resultRepo.AddAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<QCResultDto>.Success(new QCResultDto(
            result.Id, result.QCSampleId, sample.Name, sample.Level,
            result.TestFileParameterId, param.ParameterName, param.Unit,
            user.Name, result.ResultDate, result.Value, result.ZScore,
            result.Status, result.WestgardFlags, result.Comment),
            target is null
                ? "Result saved. No target found — Z-score not calculated."
                : $"Result saved. Z-score: {evaluation.ZScore:F3}. Status: {evaluation.Status}.");
    }
}
