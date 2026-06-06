namespace QCModule.Application.Features.Settings.DTOs;

public record FileWatcherSettingsDto(
    bool   Enabled,
    string FolderPath,
    string ArchivePath,
    int    IntervalSeconds
);
