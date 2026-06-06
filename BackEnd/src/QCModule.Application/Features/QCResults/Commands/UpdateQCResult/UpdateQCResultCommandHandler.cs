using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCResults.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCResults.Commands.UpdateQCResult;

public class UpdateQCResultCommandHandler(
    IRepository<QCResult>          resultRepo,
    IRepository<QCSample>          sampleRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<QCSampleTarget>    targetRepo,
    IRepository<User>              userRepo,
    IUnitOfWork                    unitOfWork,
    IWestgardService               westgard)
    : IRequestHandler<UpdateQCResultCommand, Result<QCResultDto>>
{
    public async Task<Result<QCResultDto>> Handle(UpdateQCResultCommand request, CancellationToken cancellationToken)
    {
        var items  = await resultRepo.FindAsync(r => r.Id == request.Id, cancellationToken);
        var result = items.FirstOrDefault() ?? throw new NotFoundException("QC Result", request.Id);

        if (result.ValidationStatus != ValidationStatus.Pending)
            throw new InvalidOperationException("Only pending results can be edited.");

        // Re-evaluate Westgard with new value
        var targets = await targetRepo.FindAsync(
            t => t.QCSampleId == result.QCSampleId && t.TestFileParameterId == result.TestFileParameterId,
            cancellationToken);
        var target = targets.FirstOrDefault();

        WestgardResult evaluation;
        if (target is not null)
            evaluation = await westgard.EvaluateAsync(request.Value, target.Mean, target.SD, cancellationToken);
        else
            evaluation = new WestgardResult(QCStatus.Pending, string.Empty, 0);

        result.ResultDate    = request.ResultDate.ToUniversalTime();
        result.Value         = request.Value;
        result.ZScore        = evaluation.ZScore;
        result.Status        = evaluation.Status;
        result.WestgardFlags = string.IsNullOrEmpty(evaluation.Flags) ? null : evaluation.Flags;
        result.Comment       = request.Comment?.Trim();

        await resultRepo.UpdateAsync(result, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var samples = await sampleRepo.FindAsync(s => s.Id == result.QCSampleId, cancellationToken);
        var sample  = samples.FirstOrDefault();
        var params_ = await paramRepo.FindAsync(p => p.Id == result.TestFileParameterId, cancellationToken);
        var param   = params_.FirstOrDefault();
        var users   = await userRepo.FindAsync(u => u.Id == result.UserId, cancellationToken);
        var user    = users.FirstOrDefault();

        return Result<QCResultDto>.Success(new QCResultDto(
            result.Id, result.QCSampleId, sample?.Name ?? "?", sample?.Level ?? "?",
            result.TestFileParameterId, param?.ParameterName ?? "?", param?.Unit,
            user?.Name ?? "?", result.ResultDate, result.Value, result.ZScore,
            result.Status, result.WestgardFlags, result.Comment),
            "Result updated.");
    }
}
