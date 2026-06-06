using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Settings.DTOs;

namespace QCModule.Application.Features.Settings.Queries.GetFileWatcherSettings;

public record GetFileWatcherSettingsQuery : IRequest<Result<FileWatcherSettingsDto>>;
