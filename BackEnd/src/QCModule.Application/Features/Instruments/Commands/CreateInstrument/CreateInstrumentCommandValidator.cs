using FluentValidation;

namespace QCModule.Application.Features.Instruments.Commands.CreateInstrument;

public class CreateInstrumentCommandValidator : AbstractValidator<CreateInstrumentCommand>
{
    public CreateInstrumentCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Instrument name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Instrument code is required.")
            .MaximumLength(50);
    }
}
