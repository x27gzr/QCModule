using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Commands.CreateQCSample;

public class CreateQCSampleCommandHandler(
    IRepository<QCSample>   sampleRepo,
    IRepository<Instrument> instrumentRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<CreateQCSampleCommand, Result<QCSampleDto>>
{
    public async Task<Result<QCSampleDto>> Handle(CreateQCSampleCommand request, CancellationToken cancellationToken)
    {
        var instruments = await instrumentRepo.FindAsync(i => i.Id == request.InstrumentId, cancellationToken);
        var instrument  = instruments.FirstOrDefault()
            ?? throw new NotFoundException("Instrument", request.InstrumentId);

        var sample = new QCSample
        {
            Name         = request.Name.Trim(),
            LotNumber    = request.LotNumber.Trim(),
            Level        = request.Level.Trim(),
            ExpiryDate   = request.ExpiryDate.ToUniversalTime(),
            InstrumentId = request.InstrumentId
        };

        await sampleRepo.AddAsync(sample, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        return Result<QCSampleDto>.Success(new QCSampleDto(
            sample.Id, sample.Name, sample.LotNumber, sample.Level, sample.ExpiryDate,
            sample.InstrumentId, instrument.Name,
            sample.ExpiryDate < now,
            sample.ExpiryDate >= now && sample.ExpiryDate < now.AddDays(30),
            sample.CreatedAt), "QC Sample created successfully.");
    }
}
