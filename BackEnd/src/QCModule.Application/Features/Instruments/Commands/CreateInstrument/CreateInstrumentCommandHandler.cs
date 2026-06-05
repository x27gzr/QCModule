using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Commands.CreateInstrument;

public class CreateInstrumentCommandHandler(IRepository<Instrument> repo, IUnitOfWork unitOfWork)
    : IRequestHandler<CreateInstrumentCommand, Result<InstrumentDto>>
{
    public async Task<Result<InstrumentDto>> Handle(CreateInstrumentCommand request, CancellationToken cancellationToken)
    {
        var existing = await repo.FindAsync(i => i.Code == request.Code.Trim().ToUpper(), cancellationToken);
        if (existing.Any())
            throw new ConflictException($"Instrument with code '{request.Code}' already exists.");

        var instrument = new Instrument
        {
            Name         = request.Name.Trim(),
            Code         = request.Code.Trim().ToUpper(),
            Manufacturer = request.Manufacturer?.Trim(),
            Model        = request.Model?.Trim(),
            SerialNumber = request.SerialNumber?.Trim(),
            IsActive     = true
        };

        await repo.AddAsync(instrument, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InstrumentDto>.Success(
            new InstrumentDto(instrument.Id, instrument.Name, instrument.Code,
                instrument.Manufacturer, instrument.Model, instrument.SerialNumber,
                instrument.IsActive, instrument.CreatedAt),
            "Instrument created successfully.");
    }
}
