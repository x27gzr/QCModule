using FluentValidation;

namespace QCModule.Application.Features.Settings.Commands.UpdateLoginCustomization;

public class UpdateLoginCustomizationCommandValidator : AbstractValidator<UpdateLoginCustomizationCommand>
{
    private static readonly string[] Presets = ["gradient-blue", "gradient-purple", "gradient-emerald", "gradient-slate"];
    private static readonly string[] Colors  = ["blue", "purple", "green", "red", "orange", "teal"];
    private static readonly string[] Sizes   = ["small", "medium", "large"];

    public UpdateLoginCustomizationCommandValidator()
    {
        RuleFor(x => x.BackgroundPreset).Must(p => Presets.Contains(p)).WithMessage("Invalid background preset.");
        RuleFor(x => x.CircleColor).Must(c => Colors.Contains(c)).WithMessage("Invalid circle color.");
        RuleFor(x => x.LogoSize).Must(s => Sizes.Contains(s)).WithMessage("Invalid logo size.");
        RuleFor(x => x.AppTitle).NotEmpty().MaximumLength(60);
        RuleFor(x => x.AppSubtitle).MaximumLength(120);
    }
}
