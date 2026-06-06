using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;

namespace QCModule.Application.Features.Instruments.Commands.UpdateInstrument;

public record UpdateInstrumentCommand(
    Guid   Id,
    string Name,
    string Code,
    Guid   TestFileId,
    bool   IsActive
) : IRequest<Result<InstrumentDto>>;
