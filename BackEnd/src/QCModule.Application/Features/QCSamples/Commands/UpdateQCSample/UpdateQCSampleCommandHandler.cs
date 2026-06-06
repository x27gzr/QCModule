using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.Commands.CreateQCSample;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Commands.UpdateQCSample;

public class UpdateQCSampleCommandHandler(
    IRepository<QCSample>   sampleRepo,
    IRepository<Instrument> instrumentRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<UpdateQCSampleCommand, Result<QCSampleDto>>
{
    public async Task<Result<QCSampleDto>> Handle(UpdateQCSampleCommand request, CancellationToken cancellationToken)
    {
        var samples = await sampleRepo.FindAsync(s => s.Id == request.Id, cancellationToken);
        var sample  = samples.FirstOrDefault()
            ?? throw new NotFoundException("QC Sample", request.Id);

        var instruments = await instrumentRepo.FindAsync(i => i.Id == request.InstrumentId, cancellationToken);
        var instrument  = instruments.FirstOrDefault()
            ?? throw new NotFoundException("Instrument", request.InstrumentId);

        var r = request.WestgardRules;
        sample.Name         = request.Name.Trim();
        sample.LotNumber    = request.LotNumber.Trim();
        sample.Level        = request.Level.Trim();
        sample.ExpiryDate   = request.ExpiryDate.ToUniversalTime();
        sample.InstrumentId = request.InstrumentId;
        sample.IsActive     = request.IsActive;
        sample.Rule1_2s     = r.Rule1_2s;
        sample.Rule1_3s     = r.Rule1_3s;
        sample.Rule3_1s     = r.Rule3_1s;
        sample.Rule2_2s     = r.Rule2_2s;
        sample.RuleR_4s     = r.RuleR_4s;
        sample.Rule4_1s     = r.Rule4_1s;
        sample.Rule9x       = r.Rule9x;
        sample.Rule10x      = r.Rule10x;

        await sampleRepo.UpdateAsync(sample, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<QCSampleDto>.Success(
            CreateQCSampleCommandHandler.MapDto(sample, instrument.Name, DateTime.UtcNow),
            "QC Sample updated successfully.");
    }
}
