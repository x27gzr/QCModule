using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Instruments.Queries.GetInstrumentById;

public class GetInstrumentByIdQueryHandler(IRepository<Instrument> repo, IRepository<TestFile> testFileRepo)
    : IRequestHandler<GetInstrumentByIdQuery, Result<InstrumentDto>>
{
    public async Task<Result<InstrumentDto>> Handle(GetInstrumentByIdQuery request, CancellationToken cancellationToken)
    {
        var items = await repo.FindAsync(i => i.Id == request.Id, cancellationToken);
        var item  = items.FirstOrDefault()
            ?? throw new NotFoundException("Instrument", request.Id);

        var testFiles = await testFileRepo.FindAsync(t => t.Id == item.TestFileId, cancellationToken);
        var testFile  = testFiles.FirstOrDefault();

        return Result<InstrumentDto>.Success(new InstrumentDto(
            item.Id, item.Name, item.Code, item.IsActive,
            item.TestFileId,
            testFile?.Name ?? "—",
            item.CreatedAt));
    }
}
