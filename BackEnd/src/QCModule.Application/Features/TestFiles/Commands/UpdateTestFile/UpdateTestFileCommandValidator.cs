using FluentValidation;

namespace QCModule.Application.Features.TestFiles.Commands.UpdateTestFile;

public class UpdateTestFileCommandValidator : AbstractValidator<UpdateTestFileCommand>
{
    private static readonly string[] ValidTypes = ["Numerical", "Non Numerical"];

    public UpdateTestFileCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Type).NotEmpty()
            .Must(t => ValidTypes.Contains(t))
            .WithMessage("Type must be 'Numerical' or 'Non Numerical'.");
        RuleFor(x => x.Parameters).NotEmpty()
            .WithMessage("At least 1 parameter is required.");
        RuleForEach(x => x.Parameters).ChildRules(p =>
        {
            p.RuleFor(x => x.ParameterName).NotEmpty().MaximumLength(100);
            p.RuleFor(x => x.Sequence).GreaterThanOrEqualTo(0);
        });
    }
}
