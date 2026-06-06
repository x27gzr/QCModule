using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Commands.UpdateInstrument;

public class UpdateInstrumentCommandHandler(
    IRepository<Instrument> repo,
    IRepository<TestFile>   testFileRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<UpdateInstrumentCommand, Result<InstrumentDto>>
{
    public async Task<Result<InstrumentDto>> Handle(UpdateInstrumentCommand request, CancellationToken cancellationToken)
    {
        var items = await repo.FindAsync(i => i.Id == request.Id, cancellationToken);
        var item  = items.FirstOrDefault()
            ?? throw new NotFoundException("Instrument", request.Id);

        var testFiles = await testFileRepo.FindAsync(t => t.Id == request.TestFileId, cancellationToken);
        var testFile  = testFiles.FirstOrDefault()
            ?? throw new NotFoundException("TestFile", request.TestFileId);

        var normalizedCode = request.Code.Trim().ToUpper();
        var codeTaken = await repo.FindAsync(
            i => i.Code == normalizedCode && i.Id != request.Id, cancellationToken);
        if (codeTaken.Any())
            throw new ConflictException($"Instrument with code '{normalizedCode}' already exists.");

        item.Name       = request.Name.Trim();
        item.Code       = normalizedCode;
        item.TestFileId = request.TestFileId;
        item.IsActive   = request.IsActive;

        await repo.UpdateAsync(item, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InstrumentDto>.Success(
            new InstrumentDto(item.Id, item.Name, item.Code, item.IsActive,
                item.TestFileId, testFile.Name, item.CreatedAt),
            "Instrument updated successfully.");
    }
}
