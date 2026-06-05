using MediatR;

namespace QCModule.Application.Features.TestFiles.Commands.DeleteTestFile;

public record DeleteTestFileCommand(Guid Id) : IRequest;
