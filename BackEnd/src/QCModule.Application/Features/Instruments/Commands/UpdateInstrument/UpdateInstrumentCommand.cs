using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;

namespace QCModule.Application.Features.Instruments.Commands.UpdateInstrument;

public record UpdateInstrumentCommand(
    Guid    Id,
    string  Name,
    string  Code,
    string? Manufacturer,
    string? Model,
    string? SerialNumber
) : IRequest<Result<InstrumentDto>>;
