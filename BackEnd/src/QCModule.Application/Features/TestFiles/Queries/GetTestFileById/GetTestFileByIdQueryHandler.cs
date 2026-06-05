using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.TestFiles.Queries.GetTestFileById;

public class GetTestFileByIdQueryHandler(
    IRepository<TestFile>          testFileRepo,
    IRepository<TestFileParameter> paramRepo)
    : IRequestHandler<GetTestFileByIdQuery, Result<TestFileDto>>
{
    public async Task<Result<TestFileDto>> Handle(GetTestFileByIdQuery request, CancellationToken cancellationToken)
    {
        var files = await testFileRepo.FindAsync(f => f.Id == request.Id, cancellationToken);
        var file  = files.FirstOrDefault()
            ?? throw new NotFoundException("Test File", request.Id);

        var parameters = await paramRepo.FindAsync(p => p.TestFileId == request.Id, cancellationToken);
        var paramDtos  = parameters.OrderBy(p => p.ParameterName)
                                   .Select(p => new TestFileParameterDto(p.Id, p.ParameterName, p.Unit, p.LowerLimit, p.UpperLimit));

        return Result<TestFileDto>.Success(new TestFileDto(
            file.Id, file.Name, file.Code, file.Unit, file.Category, file.IsActive, paramDtos, file.CreatedAt));
    }
}
