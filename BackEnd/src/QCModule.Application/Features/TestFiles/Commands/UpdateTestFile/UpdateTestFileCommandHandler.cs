using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.TestFiles.Commands.UpdateTestFile;

public class UpdateTestFileCommandHandler(
    IRepository<TestFile>          repo,
    IRepository<TestFileParameter> paramRepo,
    IUnitOfWork                    unitOfWork)
    : IRequestHandler<UpdateTestFileCommand, Result<TestFileDto>>
{
    public async Task<Result<TestFileDto>> Handle(UpdateTestFileCommand request, CancellationToken cancellationToken)
    {
        var files = await repo.FindAsync(f => f.Id == request.Id, cancellationToken);
        var file  = files.FirstOrDefault() ?? throw new NotFoundException("Test File", request.Id);

        var code = request.Code.Trim().ToUpper();
        var dup  = await repo.FindAsync(f => f.Code == code && f.Id != request.Id, cancellationToken);
        if (dup.Any()) throw new ConflictException($"Test file with code '{code}' already exists.");

        file.Name     = request.Name.Trim();
        file.Code     = code;
        file.Unit     = request.Unit?.Trim();
        file.Category = request.Category?.Trim();

        await repo.UpdateAsync(file, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var parameters = await paramRepo.FindAsync(p => p.TestFileId == file.Id, cancellationToken);
        var paramDtos  = parameters.OrderBy(p => p.ParameterName)
                                   .Select(p => new TestFileParameterDto(p.Id, p.ParameterName, p.Unit, p.LowerLimit, p.UpperLimit));

        return Result<TestFileDto>.Success(
            new TestFileDto(file.Id, file.Name, file.Code, file.Unit, file.Category, file.IsActive, paramDtos, file.CreatedAt),
            "Test file updated successfully.");
    }
}
