using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Commands.UpsertTarget;

public class UpsertTargetCommandHandler(
    IRepository<QCSample>          sampleRepo,
    IRepository<TestFileParameter> paramRepo,
    IRepository<QCSampleTarget>    targetRepo,
    IUnitOfWork                    unitOfWork)
    : IRequestHandler<UpsertTargetCommand, Result<QCSampleTargetDto>>
{
    public async Task<Result<QCSampleTargetDto>> Handle(UpsertTargetCommand request, CancellationToken cancellationToken)
    {
        var samples = await sampleRepo.FindAsync(s => s.Id == request.QCSampleId, cancellationToken);
        if (!samples.Any()) throw new NotFoundException("QC Sample", request.QCSampleId);

        var params_ = await paramRepo.FindAsync(p => p.Id == request.TestFileParameterId, cancellationToken);
        var param   = params_.FirstOrDefault() ?? throw new NotFoundException("Test File Parameter", request.TestFileParameterId);

        var existing = await targetRepo.FindAsync(
            t => t.QCSampleId == request.QCSampleId && t.TestFileParameterId == request.TestFileParameterId,
            cancellationToken);
        var target = existing.FirstOrDefault();

        if (target is null)
        {
            target = new QCSampleTarget
            {
                QCSampleId          = request.QCSampleId,
                TestFileParameterId = request.TestFileParameterId,
                Mean    = request.Mean,
                SD      = request.SD,
                CV      = request.CV,
                Tea     = request.Tea,
                TeaUnit = request.TeaUnit ?? "%",
            };
            await targetRepo.AddAsync(target, cancellationToken);
        }
        else
        {
            target.Mean    = request.Mean;
            target.SD      = request.SD;
            target.CV      = request.CV;
            target.Tea     = request.Tea;
            target.TeaUnit = request.TeaUnit ?? "%";
            await targetRepo.UpdateAsync(target, cancellationToken);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<QCSampleTargetDto>.Success(
            new QCSampleTargetDto(target.Id, target.QCSampleId, target.TestFileParameterId,
                param.ParameterName, param.Unit, target.Mean, target.SD, target.CV, target.Tea, target.TeaUnit),
            "Target saved.");
    }
}
