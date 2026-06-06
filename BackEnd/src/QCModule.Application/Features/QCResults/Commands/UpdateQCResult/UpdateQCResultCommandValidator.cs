using FluentValidation;

namespace QCModule.Application.Features.QCResults.Commands.UpdateQCResult;

public class UpdateQCResultCommandValidator : AbstractValidator<UpdateQCResultCommand>
{
    public UpdateQCResultCommandValidator()
    {
        RuleFor(x => x.Value).NotEmpty().GreaterThanOrEqualTo(0);
        RuleFor(x => x.ResultDate).NotEmpty();
    }
}
