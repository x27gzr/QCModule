namespace QCModule.Application.Features.Settings.DTOs;

public record LoginCustomizationDto(
    string BackgroundPreset,   // gradient-blue | gradient-purple | gradient-emerald | gradient-slate
    string CircleColor,        // blue | purple | green | red | orange | teal
    bool   ShowCircle,
    string LogoSize,           // small | medium | large
    string AppTitle,
    string AppSubtitle
);
