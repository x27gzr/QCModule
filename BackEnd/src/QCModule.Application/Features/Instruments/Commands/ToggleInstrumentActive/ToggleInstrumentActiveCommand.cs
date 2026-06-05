using MediatR;
using QCModule.Application.Common.Models;

namespace QCModule.Application.Features.Instruments.Commands.ToggleInstrumentActive;

public record ToggleInstrumentActiveCommand(Guid Id) : IRequest<Result<bool>>;
