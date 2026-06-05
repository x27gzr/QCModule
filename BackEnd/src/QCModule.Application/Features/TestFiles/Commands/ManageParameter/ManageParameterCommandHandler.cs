using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.TestFiles.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Exceptions;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.TestFiles.Commands.ManageParameter;

public class AddParameterCommandHandler(
    IRepository<TestFile>          testFileRepo,
    IRepository<TestFileParameter> paramRepo,
    IUnitOfWork                    unitOfWork)
    : IRequestHandler<AddParameterCommand, Result<TestFileParameterDto>>
{
    public async Task<Result<TestFileParameterDto>> Handle(AddParameterCommand request, CancellationToken cancellationToken)
    {
        var files = await testFileRepo.FindAsync(f => f.Id == request.TestFileId, cancellationToken);
        if (!files.Any()) throw new NotFoundException("Test File", request.TestFileId);

        var param = new TestFileParameter
        {
            TestFileId    = request.TestFileId,
            ParameterName = request.ParameterName.Trim(),
            Unit          = request.Unit?.Trim(),
            LowerLimit    = request.LowerLimit,
            UpperLimit    = request.UpperLimit
        };

        await paramRepo.AddAsync(param, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TestFileParameterDto>.Success(
            new TestFileParameterDto(param.Id, param.ParameterName, param.Unit, param.LowerLimit, param.UpperLimit),
            "Parameter added.");
    }
}

public class UpdateParameterCommandHandler(IRepository<TestFileParameter> paramRepo, IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateParameterCommand, Result<TestFileParameterDto>>
{
    public async Task<Result<TestFileParameterDto>> Handle(UpdateParameterCommand request, CancellationToken cancellationToken)
    {
        var items = await paramRepo.FindAsync(p => p.Id == request.ParameterId, cancellationToken);
        var param = items.FirstOrDefault() ?? throw new NotFoundException("Parameter", request.ParameterId);

        param.ParameterName = request.ParameterName.Trim();
        param.Unit          = request.Unit?.Trim();
        param.LowerLimit    = request.LowerLimit;
        param.UpperLimit    = request.UpperLimit;

        await paramRepo.UpdateAsync(param, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TestFileParameterDto>.Success(
            new TestFileParameterDto(param.Id, param.ParameterName, param.Unit, param.LowerLimit, param.UpperLimit));
    }
}

public class DeleteParameterCommandHandler(IRepository<TestFileParameter> paramRepo, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteParameterCommand>
{
    public async Task Handle(DeleteParameterCommand request, CancellationToken cancellationToken)
    {
        var items = await paramRepo.FindAsync(p => p.Id == request.ParameterId, cancellationToken);
        var param = items.FirstOrDefault() ?? throw new NotFoundException("Parameter", request.ParameterId);
        await paramRepo.DeleteAsync(param, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
