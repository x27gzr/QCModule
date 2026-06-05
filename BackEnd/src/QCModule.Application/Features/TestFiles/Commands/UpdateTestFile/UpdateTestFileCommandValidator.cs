using FluentValidation;

namespace QCModule.Application.Features.TestFiles.Commands.UpdateTestFile;

public class UpdateTestFileCommandValidator : AbstractValidator<UpdateTestFileCommand>
{
    public UpdateTestFileCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}
