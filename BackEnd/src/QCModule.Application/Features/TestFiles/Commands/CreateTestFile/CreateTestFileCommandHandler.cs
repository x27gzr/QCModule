using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.TestFiles.Commands.CreateTestFile;

public class CreateTestFileCommandHandler(
    IRepository<TestFile>          repo,
    IRepository<TestFileParameter> paramRepo,
    IUnitOfWork                    unitOfWork)
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

        var paramList = new List<TestFileParameter>();
        foreach (var p in request.Parameters)
        {
            var param = new TestFileParameter
            {
                TestFileId    = file.Id,
                ParameterName = p.ParameterName.Trim(),
                TestCode      = p.TestCode?.Trim(),
                OutputMask    = p.OutputMask?.Trim(),
                Sequence      = p.Sequence,
                Unit          = p.Unit?.Trim(),
                LowerLimit    = p.LowerLimit,
                UpperLimit    = p.UpperLimit
            };
            await paramRepo.AddAsync(param, cancellationToken);
            paramList.Add(param);
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        var paramDtos = paramList.OrderBy(p => p.Sequence).ThenBy(p => p.ParameterName)
            .Select(p => new TestFileParameterDto(p.Id, p.ParameterName, p.TestCode, p.OutputMask,
                p.Sequence, p.Unit, p.LowerLimit, p.UpperLimit));

        return Result<TestFileDto>.Success(
            new TestFileDto(file.Id, file.Name, file.Code, file.Type, file.Unit, file.IsActive, paramDtos, file.CreatedAt),
            "Test file created successfully.");
    }
}
