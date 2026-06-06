using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.DTOs;

namespace QCModule.Application.Features.Settings.Commands.UpdateFileWatcherSettings;

public record UpdateFileWatcherSettingsCommand(
    bool   Enabled,
    string FolderPath,
    string ArchivePath,
    int    IntervalSeconds
) : IRequest<Result<FileWatcherSettingsDto>>;
