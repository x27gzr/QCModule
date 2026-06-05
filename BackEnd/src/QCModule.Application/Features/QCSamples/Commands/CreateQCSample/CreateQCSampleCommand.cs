using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;

namespace QCModule.Application.Features.QCSamples.Commands.CreateQCSample;

public record CreateQCSampleCommand(
    string   Name,
    string   LotNumber,
    string   Level,
    DateTime ExpiryDate,
    Guid     InstrumentId
) : IRequest<Result<QCSampleDto>>;
