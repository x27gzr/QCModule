using MediatR;
using QCModule.Application.Common.Models;
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

        sample.Name         = request.Name.Trim();
        sample.LotNumber    = request.LotNumber.Trim();
        sample.Level        = request.Level.Trim();
        sample.ExpiryDate   = request.ExpiryDate.ToUniversalTime();
        sample.InstrumentId = request.InstrumentId;

        await sampleRepo.UpdateAsync(sample, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        return Result<QCSampleDto>.Success(new QCSampleDto(
            sample.Id, sample.Name, sample.LotNumber, sample.Level, sample.ExpiryDate,
            sample.InstrumentId, instrument.Name,
            sample.ExpiryDate < now,
            sample.ExpiryDate >= now && sample.ExpiryDate < now.AddDays(30),
            sample.CreatedAt), "QC Sample updated successfully.");
    }
}
