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

        var r = request.WestgardRules;
        var sample = new QCSample
        {
            Name         = request.Name.Trim(),
            LotNumber    = request.LotNumber.Trim(),
            Level        = request.Level.Trim(),
            ExpiryDate   = request.ExpiryDate.ToUniversalTime(),
            InstrumentId = request.InstrumentId,
            IsActive     = request.IsActive,
            Rule1_2s     = r.Rule1_2s,
            Rule1_3s     = r.Rule1_3s,
            Rule3_1s     = r.Rule3_1s,
            Rule2_2s     = r.Rule2_2s,
            RuleR_4s     = r.RuleR_4s,
            Rule4_1s     = r.Rule4_1s,
            Rule9x       = r.Rule9x,
            Rule10x      = r.Rule10x,
        };

        await sampleRepo.AddAsync(sample, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        return Result<QCSampleDto>.Success(MapDto(sample, instrument.Name, now), "QC Sample created successfully.");
    }

    internal static QCSampleDto MapDto(QCSample s, string instrumentName, DateTime now) => new(
        s.Id, s.Name, s.LotNumber, s.Level, s.ExpiryDate,
        s.InstrumentId, instrumentName,
        s.IsActive,
        s.ExpiryDate < now,
        s.ExpiryDate >= now && s.ExpiryDate < now.AddDays(30),
        new WestgardRulesDto(s.Rule1_2s, s.Rule1_3s, s.Rule3_1s, s.Rule2_2s, s.RuleR_4s, s.Rule4_1s, s.Rule9x, s.Rule10x),
        s.CreatedAt);
}
