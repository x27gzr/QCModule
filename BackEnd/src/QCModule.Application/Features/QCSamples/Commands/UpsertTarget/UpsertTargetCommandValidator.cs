using FluentValidation;

namespace QCModule.Application.Features.QCSamples.Commands.UpsertTarget;

public class UpsertTargetCommandValidator : AbstractValidator<UpsertTargetCommand>
{
    public UpsertTargetCommandValidator()
    {
        RuleFor(x => x.Mean).NotEqual(0).WithMessage("Mean cannot be zero.");
        RuleFor(x => x.SD).GreaterThan(0).WithMessage("SD must be greater than zero.");
        RuleFor(x => x.CV).GreaterThan(0).WithMessage("CV must be greater than zero.");
    }
}
