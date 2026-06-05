using FluentValidation;

namespace QCModule.Application.Features.QCResults.Commands.CreateQCResult;

public class CreateQCResultCommandValidator : AbstractValidator<CreateQCResultCommand>
{
    public CreateQCResultCommandValidator()
    {
        RuleFor(x => x.QCSampleId).NotEmpty();
        RuleFor(x => x.TestFileParameterId).NotEmpty();
        RuleFor(x => x.ResultDate).NotEmpty().LessThanOrEqualTo(DateTime.UtcNow.AddMinutes(5))
            .WithMessage("Result date cannot be in the future.");
        RuleFor(x => x.Value).NotEqual(0).WithMessage("Value must not be zero.");
    }
}
