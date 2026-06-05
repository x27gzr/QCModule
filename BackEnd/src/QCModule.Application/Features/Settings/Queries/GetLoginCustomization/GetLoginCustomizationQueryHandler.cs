using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Settings.Queries.GetLoginCustomization;

public class GetLoginCustomizationQueryHandler(IRepository<AppSetting> settingsRepo)
    : IRequestHandler<GetLoginCustomizationQuery, Result<LoginCustomizationDto>>
{
    public async Task<Result<LoginCustomizationDto>> Handle(GetLoginCustomizationQuery request, CancellationToken cancellationToken)
    {
        var all = await settingsRepo.GetAllAsync(cancellationToken);
        var map = all.ToDictionary(s => s.Key, s => s.Value);

        string Get(string key, string fallback) =>
            map.TryGetValue(key, out var v) && !string.IsNullOrEmpty(v) ? v! : fallback;

        var dto = new LoginCustomizationDto(
            BackgroundPreset: Get("login_background_preset", "gradient-blue"),
            CircleColor:      Get("login_circle_color", "blue"),
            ShowCircle:       Get("login_show_circle", "true") == "true",
            LogoSize:         Get("login_logo_size", "medium"),
            AppTitle:         Get("app_title", "QC Module"),
            AppSubtitle:      Get("app_subtitle", "Laboratory Quality Control"));

        return Result<LoginCustomizationDto>.Success(dto);
    }
}
