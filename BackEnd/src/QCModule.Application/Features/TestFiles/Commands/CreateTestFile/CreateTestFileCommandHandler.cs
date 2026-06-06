using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.TestFiles.Commands.CreateTestFile;

public class CreateTestFileCommandHandler(IRepository<TestFile> repo, IUnitOfWork unitOfWork)
    : IRequestHandler<CreateTestFileCommand, Result<TestFileDto>>
{
    public async Task<Result<TestFileDto>> Handle(CreateTestFileCommand request, CancellationToken cancellationToken)
    {
        var existing = await repo.FindAsync(f => f.Code == request.Code.Trim().ToUpper(), cancellationToken);
        if (existing.Any())
            throw new ConflictException($"Test file with code '{request.Code}' already exists.");

        var file = new TestFile
        {
            Name     = request.Name.Trim(),
            Code     = request.Code.Trim().ToUpper(),
            Type     = request.Type.Trim(),
            Unit     = request.Unit?.Trim(),
            IsActive = true
        };

        await repo.AddAsync(file, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TestFileDto>.Success(
            new TestFileDto(file.Id, file.Name, file.Code, file.Type, file.Unit, file.IsActive, [], file.CreatedAt),
            "Test file created successfully.");
    }
}
