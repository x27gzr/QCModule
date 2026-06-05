using MediatR;

namespace QCModule.Application.Features.QCSamples.Commands.DeleteQCSample;

public record DeleteQCSampleCommand(Guid Id) : IRequest;
