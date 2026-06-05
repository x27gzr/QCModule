using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;

namespace QCModule.Application.Features.Instruments.Commands.CreateInstrument;

public record CreateInstrumentCommand(
    string  Name,
    string  Code,
    string? Manufacturer,
    string? Model,
    string? SerialNumber
) : IRequest<Result<InstrumentDto>>;
