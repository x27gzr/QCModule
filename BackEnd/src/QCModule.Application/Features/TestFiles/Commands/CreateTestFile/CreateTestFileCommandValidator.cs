using FluentValidation;

namespace QCModule.Application.Features.TestFiles.Commands.CreateTestFile;

public class CreateTestFileCommandValidator : AbstractValidator<CreateTestFileCommand>
{
    private static readonly string[] ValidTypes = ["Numerical", "Non Numerical"];

    public CreateTestFileCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Type).NotEmpty().Must(t => ValidTypes.Contains(t))
            .WithMessage("Type must be 'Numerical' or 'Non Numerical'.");
    }
}
