using FluentValidation;

namespace QCModule.Application.Features.TestFiles.Commands.CreateTestFile;

public class CreateTestFileCommandValidator : AbstractValidator<CreateTestFileCommand>
{
    public CreateTestFileCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}
