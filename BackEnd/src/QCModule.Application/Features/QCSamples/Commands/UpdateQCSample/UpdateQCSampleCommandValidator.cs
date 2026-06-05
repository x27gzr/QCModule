using FluentValidation;

namespace QCModule.Application.Features.QCSamples.Commands.UpdateQCSample;

public class UpdateQCSampleCommandValidator : AbstractValidator<UpdateQCSampleCommand>
{
    public UpdateQCSampleCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Name is required.").MaximumLength(100);
        RuleFor(x => x.LotNumber).NotEmpty().WithMessage("Lot number is required.").MaximumLength(50);
        RuleFor(x => x.Level).NotEmpty().WithMessage("Level is required.").MaximumLength(20);
        RuleFor(x => x.ExpiryDate).NotEmpty().WithMessage("Expiry date is required.");
        RuleFor(x => x.InstrumentId).NotEmpty().WithMessage("Instrument is required.");
    }
}
