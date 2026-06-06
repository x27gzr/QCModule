using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Infrastructure.Persistence;

namespace QCModule.Infrastructure.Services;

public class ResFileWatcherService(
    IServiceScopeFactory          scopeFactory,
    ILogger<ResFileWatcherService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("ResFileWatcherService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var interval = 30;
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db          = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var westgard    = scope.ServiceProvider.GetRequiredService<IWestgardService>();

                var settings = await db.AppSettings
                    .Where(s => s.Key.StartsWith("file_watcher_"))
                    .ToDictionaryAsync(s => s.Key, s => s.Value ?? "", stoppingToken);

                interval = int.TryParse(settings.GetValueOrDefault("file_watcher_interval_seconds"), out var i) ? i : 30;

                var enabled = settings.GetValueOrDefault("file_watcher_enabled") == "true";
                var folder  = settings.GetValueOrDefault("file_watcher_folder_path") ?? "";
                var archive = settings.GetValueOrDefault("file_watcher_archive_path") ?? "";

                if (enabled && !string.IsNullOrEmpty(folder) && Directory.Exists(folder))
                    await ProcessFolderAsync(db, westgard, folder, archive, stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { logger.LogError(ex, "Error in ResFileWatcherService cycle."); }

            try { await Task.Delay(TimeSpan.FromSeconds(Math.Max(interval, 5)), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }

        logger.LogInformation("ResFileWatcherService stopped.");
    }

    private async Task ProcessFolderAsync(
        ApplicationDbContext db,
        IWestgardService     westgard,
        string               folder,
        string               archive,
        CancellationToken    ct)
    {
        var files = Directory.GetFiles(folder, "*.res");
        if (files.Length == 0) return;

        logger.LogInformation("Found {count} .res file(s) to process.", files.Length);

        // Load lookup tables once per cycle for efficiency
        var instruments = await db.Instruments
            .Include(i => i.TestFile)
                .ThenInclude(tf => tf.Parameters)
            .Where(i => i.IsActive)
            .ToListAsync(ct);

        var samples = await db.QCSamples
            .Where(s => s.IsActive)
            .ToListAsync(ct);

        var allTargets = await db.QCSampleTargets.ToListAsync(ct);

        foreach (var filePath in files)
        {
            var errorFolder = string.IsNullOrEmpty(archive)
                ? Path.Combine(folder, "errors")
                : Path.Combine(archive, "errors");

            try
            {
                await ProcessFileAsync(db, westgard, filePath, archive, errorFolder,
                    instruments, samples, allTargets, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled error processing {file}.", filePath);
                TryMoveFile(filePath, errorFolder);
            }
        }
    }

    private async Task ProcessFileAsync(
        ApplicationDbContext      db,
        IWestgardService          westgard,
        string                    filePath,
        string                    archive,
        string                    errorFolder,
        List<Instrument>          instruments,
        List<QCSample>            samples,
        List<QCSampleTarget>      allTargets,
        CancellationToken         ct)
    {
        var model = ResFileParser.Parse(filePath);
        if (model == null)
        {
            logger.LogWarning("Cannot parse {file} — moving to errors.", Path.GetFileName(filePath));
            TryMoveFile(filePath, errorFolder);
            return;
        }

        if (model.Type != "C")
        {
            logger.LogDebug("Skipping {file}: type={type} (not Control).", Path.GetFileName(filePath), model.Type);
            TryMoveFile(filePath, archive);
            return;
        }

        var instrument = instruments.FirstOrDefault(i => i.Code == model.InstrumentCode);
        if (instrument == null)
        {
            logger.LogWarning("Instrument code '{code}' not found. Moving {file} to errors.",
                model.InstrumentCode, Path.GetFileName(filePath));
            TryMoveFile(filePath, errorFolder);
            return;
        }

        var sample = samples.FirstOrDefault(
            s => s.InstrumentId == instrument.Id && s.LotNumber == model.LotNumber);
        if (sample == null)
        {
            logger.LogWarning("No active QCSample for instrument '{code}' lot '{lot}'. Moving {file} to errors.",
                model.InstrumentCode, model.LotNumber, Path.GetFileName(filePath));
            TryMoveFile(filePath, errorFolder);
            return;
        }

        var paramMap  = instrument.TestFile.Parameters
            .Where(p => p.TestCode != null)
            .ToDictionary(p => p.TestCode!, p => p);

        var targetMap = allTargets
            .Where(t => t.QCSampleId == sample.Id)
            .ToDictionary(t => t.TestFileParameterId);

        var created = 0;
        foreach (var (testCode, value) in model.Parameters)
        {
            if (!paramMap.TryGetValue(testCode, out var param)) continue;

            targetMap.TryGetValue(param.Id, out var target);

            var eval = target != null
                ? await westgard.EvaluateAsync(value, target.Mean, target.SD, ct)
                : new WestgardResult(QCStatus.Pending, string.Empty, 0);

            db.QCResults.Add(new QCResult
            {
                QCSampleId          = sample.Id,
                TestFileParameterId = param.Id,
                UserId              = null,
                ResultDate          = model.ReportDate.ToUniversalTime(),
                Value               = value,
                ZScore              = eval.ZScore,
                Status              = eval.Status,
                WestgardFlags       = string.IsNullOrEmpty(eval.Flags) ? null : eval.Flags,
            });
            created++;
        }

        if (created > 0)
            await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Processed {file}: {n} result(s) created for sample '{sample}' (Lot: {lot}).",
            Path.GetFileName(filePath), created, sample.Name, sample.LotNumber);

        TryMoveFile(filePath, archive);
    }

    private void TryMoveFile(string source, string destFolder)
    {
        try
        {
            if (string.IsNullOrEmpty(destFolder))
            {
                File.Delete(source);
                return;
            }

            Directory.CreateDirectory(destFolder);
            var fileName = Path.GetFileNameWithoutExtension(source);
            var ext      = Path.GetExtension(source);
            var dest     = Path.Combine(destFolder, Path.GetFileName(source));

            if (File.Exists(dest))
                dest = Path.Combine(destFolder, $"{fileName}_{DateTime.Now:yyyyMMddHHmmss}{ext}");

            File.Move(source, dest);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to move file {source} to {dest}.", source, destFolder);
        }
    }
}
