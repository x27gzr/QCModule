using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;

namespace QCModule.Application.Features.QCSamples.Commands.UpdateQCSample;

public record UpdateQCSampleCommand(
    Guid             Id,
    string           Name,
    string           LotNumber,
    string           Level,
    DateTime         ExpiryDate,
    Guid             InstrumentId,
    bool             IsActive,
    WestgardRulesDto WestgardRules
) : IRequest<Result<QCSampleDto>>;
