using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.Commands.CreateQCSample;
using QCModule.Application.Features.QCSamples.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.QCSamples.Queries.GetQCSampleById;

public class GetQCSampleByIdQueryHandler(
    IRepository<QCSample>   sampleRepo,
    IRepository<Instrument> instrumentRepo)
    : IRequestHandler<GetQCSampleByIdQuery, Result<QCSampleDto>>
{
    public async Task<Result<QCSampleDto>> Handle(GetQCSampleByIdQuery request, CancellationToken cancellationToken)
    {
        var samples = await sampleRepo.FindAsync(s => s.Id == request.Id, cancellationToken);
        var sample  = samples.FirstOrDefault()
            ?? throw new NotFoundException("QC Sample", request.Id);

        var instruments = await instrumentRepo.FindAsync(i => i.Id == sample.InstrumentId, cancellationToken);
        var instrument  = instruments.FirstOrDefault();

        return Result<QCSampleDto>.Success(
            CreateQCSampleCommandHandler.MapDto(sample, instrument?.Name ?? "Unknown", DateTime.UtcNow));
    }
}
