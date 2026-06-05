using MediatR;

namespace QCModule.Application.Features.Instruments.Commands.DeleteInstrument;

public record DeleteInstrumentCommand(Guid Id) : IRequest;
