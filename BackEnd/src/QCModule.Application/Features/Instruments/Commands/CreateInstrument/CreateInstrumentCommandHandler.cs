using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Commands.CreateInstrument;

public class CreateInstrumentCommandHandler(
    IRepository<Instrument> repo,
    IRepository<TestFile>   testFileRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<CreateInstrumentCommand, Result<InstrumentDto>>
{
    public async Task<Result<InstrumentDto>> Handle(CreateInstrumentCommand request, CancellationToken cancellationToken)
    {
        var testFiles = await testFileRepo.FindAsync(t => t.Id == request.TestFileId, cancellationToken);
        var testFile  = testFiles.FirstOrDefault()
            ?? throw new NotFoundException("TestFile", request.TestFileId);

        var existing = await repo.FindAsync(i => i.Code == request.Code.Trim().ToUpper(), cancellationToken);
        if (existing.Any())
            throw new ConflictException($"Instrument with code '{request.Code}' already exists.");

        var instrument = new Instrument
        {
            Name       = request.Name.Trim(),
            Code       = request.Code.Trim().ToUpper(),
            TestFileId = request.TestFileId,
            IsActive   = request.IsActive
        };

        await repo.AddAsync(instrument, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InstrumentDto>.Success(
            new InstrumentDto(instrument.Id, instrument.Name, instrument.Code,
                instrument.IsActive, instrument.TestFileId, testFile.Name, instrument.CreatedAt),
            "Instrument created successfully.");
    }
}
