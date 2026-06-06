using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Settings.Queries.GetFileWatcherSettings;

public class GetFileWatcherSettingsQueryHandler(IRepository<AppSetting> settingsRepo)
    : IRequestHandler<GetFileWatcherSettingsQuery, Result<FileWatcherSettingsDto>>
{
    public async Task<Result<FileWatcherSettingsDto>> Handle(GetFileWatcherSettingsQuery request, CancellationToken cancellationToken)
    {
        var all = await settingsRepo.GetAllAsync(cancellationToken);
        var map = all.ToDictionary(s => s.Key, s => s.Value ?? "");

        string Get(string key, string fallback) =>
            map.TryGetValue(key, out var v) && !string.IsNullOrEmpty(v) ? v : fallback;

        return Result<FileWatcherSettingsDto>.Success(new FileWatcherSettingsDto(
            Enabled:         Get("file_watcher_enabled", "false") == "true",
            FolderPath:      Get("file_watcher_folder_path", ""),
            ArchivePath:     Get("file_watcher_archive_path", ""),
            IntervalSeconds: int.TryParse(Get("file_watcher_interval_seconds", "30"), out var i) ? i : 30));
    }
}
