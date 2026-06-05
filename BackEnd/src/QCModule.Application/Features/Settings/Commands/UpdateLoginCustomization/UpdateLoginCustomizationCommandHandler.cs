using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Settings.Commands.UpdateLoginCustomization;

public class UpdateLoginCustomizationCommandHandler(
    IRepository<AppSetting> settingsRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<UpdateLoginCustomizationCommand, Result<LoginCustomizationDto>>
{
    public async Task<Result<LoginCustomizationDto>> Handle(UpdateLoginCustomizationCommand request, CancellationToken cancellationToken)
    {
        var values = new Dictionary<string, string>
        {
            ["login_background_preset"] = request.BackgroundPreset,
            ["login_circle_color"]      = request.CircleColor,
            ["login_show_circle"]       = request.ShowCircle ? "true" : "false",
            ["login_logo_size"]         = request.LogoSize,
            ["app_title"]               = request.AppTitle.Trim(),
            ["app_subtitle"]            = request.AppSubtitle.Trim(),
        };

        await Upsert(settingsRepo, values, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<LoginCustomizationDto>.Success(
            new LoginCustomizationDto(request.BackgroundPreset, request.CircleColor, request.ShowCircle,
                request.LogoSize, request.AppTitle.Trim(), request.AppSubtitle.Trim()),
            "Login customization saved.");
    }

    internal static async Task Upsert(IRepository<AppSetting> repo, IDictionary<string, string> values, CancellationToken ct)
    {
        var existing = await repo.GetAllAsync(ct);
        var byKey    = existing.ToDictionary(s => s.Key);

        foreach (var (key, value) in values)
        {
            if (byKey.TryGetValue(key, out var setting))
            {
                setting.Value = value;
                await repo.UpdateAsync(setting, ct);
            }
            else
            {
                await repo.AddAsync(new AppSetting { Key = key, Value = value }, ct);
            }
        }
    }
}

public class ResetLoginCustomizationCommandHandler(
    IRepository<AppSetting> settingsRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<ResetLoginCustomizationCommand, Result<LoginCustomizationDto>>
{
    public async Task<Result<LoginCustomizationDto>> Handle(ResetLoginCustomizationCommand request, CancellationToken cancellationToken)
    {
        var defaults = new Dictionary<string, string>
        {
            ["login_background_preset"] = "gradient-blue",
            ["login_circle_color"]      = "blue",
            ["login_show_circle"]       = "true",
            ["login_logo_size"]         = "medium",
            ["app_title"]               = "QC Module",
            ["app_subtitle"]            = "Laboratory Quality Control",
        };

        await UpdateLoginCustomizationCommandHandler.Upsert(settingsRepo, defaults, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<LoginCustomizationDto>.Success(
            new LoginCustomizationDto("gradient-blue", "blue", true, "medium", "QC Module", "Laboratory Quality Control"),
            "Login customization reset to defaults.");
    }
}
