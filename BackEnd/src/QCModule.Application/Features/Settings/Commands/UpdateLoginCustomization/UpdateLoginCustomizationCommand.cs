using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.DTOs;

namespace QCModule.Application.Features.Settings.Commands.UpdateLoginCustomization;

public record UpdateLoginCustomizationCommand(
    string BackgroundPreset,
    string CircleColor,
    bool   ShowCircle,
    string LogoSize,
    string AppTitle,
    string AppSubtitle
) : IRequest<Result<LoginCustomizationDto>>;

/// <summary>Resets login customization back to factory defaults.</summary>
public record ResetLoginCustomizationCommand : IRequest<Result<LoginCustomizationDto>>;
