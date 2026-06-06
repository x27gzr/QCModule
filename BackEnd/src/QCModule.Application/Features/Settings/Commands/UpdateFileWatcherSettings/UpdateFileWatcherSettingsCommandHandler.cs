using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.Commands.UpdateLoginCustomization;
using QCModule.Application.Features.Settings.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Settings.Commands.UpdateFileWatcherSettings;

public class UpdateFileWatcherSettingsCommandHandler(
    IRepository<AppSetting> settingsRepo,
    IUnitOfWork             unitOfWork)
    : IRequestHandler<UpdateFileWatcherSettingsCommand, Result<FileWatcherSettingsDto>>
{
    public async Task<Result<FileWatcherSettingsDto>> Handle(UpdateFileWatcherSettingsCommand request, CancellationToken cancellationToken)
    {
        var interval = Math.Max(5, request.IntervalSeconds);

        var values = new Dictionary<string, string>
        {
            ["file_watcher_enabled"]          = request.Enabled ? "true" : "false",
            ["file_watcher_folder_path"]      = request.FolderPath.Trim(),
            ["file_watcher_archive_path"]     = request.ArchivePath.Trim(),
            ["file_watcher_interval_seconds"] = interval.ToString(),
        };

        await UpdateLoginCustomizationCommandHandler.Upsert(settingsRepo, values, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<FileWatcherSettingsDto>.Success(
            new FileWatcherSettingsDto(request.Enabled, request.FolderPath.Trim(), request.ArchivePath.Trim(), interval),
            "File watcher settings saved.");
    }
}
