using Microsoft.EntityFrameworkCore;
using QCModule.Application.Common;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Interfaces;
using QCModule.Infrastructure.Persistence;

namespace QCModule.API.Seeding;

/// <summary>
/// One-time backfill of the PT (Prothrombin Time) QC control and its historical results.
/// Source: File/PT rsv.xlsx — 20 daily points, 29 May → 17 Jun 2026.
///
/// Run with:
///   dotnet run --project BackEnd/src/QCModule.API -- seed-pt-qc
///
/// Idempotent: safe to run more than once. Parent records are created only if
/// missing, and results are imported only when none exist yet for this sample.
/// Each result is scored through the real <see cref="IWestgardService"/>, so the
/// stored Status / Z-score / flags match exactly what the app computes at runtime.
/// </summary>
public static class PtQcDataSeeder
{
    // ── QC target (Mean/SD) driving Z-score + Westgard evaluation ────────────
    // Established in-house from the 20 points below.
    // To use the assay-sheet / package-insert target instead, set 11.0 / 0.85.
    private const double TargetMean = 11.305;
    private const double TargetSd   = 0.226;

    // ── QC sample identity (as requested) ────────────────────────────────────
    private const string LotNumber = "507969";
    private const string Level     = "2";
    private static readonly DateTime ExpiryDate = new(2026, 7, 30, 0, 0, 0, DateTimeKind.Utc);

    // Historical PT QC values, oldest → newest (one per day). Value in seconds.
    private static readonly (DateTime Date, double Value)[] Points =
    [
        (D(2026, 5, 29), 11.0), (D(2026, 5, 30), 11.3), (D(2026, 5, 31), 11.4),
        (D(2026, 6,  1), 11.3), (D(2026, 6,  2), 11.3), (D(2026, 6,  3), 11.2),
        (D(2026, 6,  4), 11.4), (D(2026, 6,  5), 11.6), (D(2026, 6,  6), 11.5),
        (D(2026, 6,  7), 11.1), (D(2026, 6,  8), 11.4), (D(2026, 6,  9), 11.3),
        (D(2026, 6, 10), 11.6), (D(2026, 6, 11), 11.7), (D(2026, 6, 12), 11.3),
        (D(2026, 6, 13), 11.3), (D(2026, 6, 14), 11.3), (D(2026, 6, 15), 11.4),
        (D(2026, 6, 16), 10.8), (D(2026, 6, 17), 10.9),
    ];

    private static DateTime D(int y, int m, int d) => new(y, m, d, 8, 0, 0, DateTimeKind.Utc);

    public static async Task RunAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        Console.WriteLine("── PT QC seeder ──────────────────────────────────────");

        var db = sp.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();

        var testFileRepo = sp.GetRequiredService<IRepository<TestFile>>();
        var paramRepo    = sp.GetRequiredService<IRepository<TestFileParameter>>();
        var instrRepo    = sp.GetRequiredService<IRepository<Instrument>>();
        var sampleRepo   = sp.GetRequiredService<IRepository<QCSample>>();
        var targetRepo   = sp.GetRequiredService<IRepository<QCSampleTarget>>();
        var resultRepo   = sp.GetRequiredService<IRepository<QCResult>>();
        var uow          = sp.GetRequiredService<IUnitOfWork>();
        var westgard     = sp.GetRequiredService<IWestgardService>();

        // 1) TestFile "PT"
        var testFile = (await testFileRepo.FindAsync(f => f.Code == "PT")).FirstOrDefault();
        if (testFile is null)
        {
            testFile = new TestFile { Name = "Prothrombin Time", Code = "PT", Type = "Numerical", Unit = "detik", IsActive = true };
            await testFileRepo.AddAsync(testFile);
            await uow.SaveChangesAsync();
            Console.WriteLine($"  + TestFile PT created            {testFile.Id}");
        }
        else Console.WriteLine($"  = TestFile PT exists             {testFile.Id}");

        // 2) TestFileParameter "PT"
        var param = (await paramRepo.FindAsync(p => p.TestFileId == testFile.Id))
            .OrderBy(p => p.Sequence).FirstOrDefault();
        if (param is null)
        {
            param = new TestFileParameter { TestFileId = testFile.Id, ParameterName = "PT", Unit = "detik", Sequence = 1 };
            await paramRepo.AddAsync(param);
            await uow.SaveChangesAsync();
            Console.WriteLine($"  + TestFileParameter PT created   {param.Id}");
        }
        else Console.WriteLine($"  = TestFileParameter PT exists    {param.Id}");

        // 3) Instrument
        var instrument = (await instrRepo.FindAsync(i => i.Code == "COAG-01")).FirstOrDefault();
        if (instrument is null)
        {
            instrument = new Instrument { Name = "Coagulation Analyzer", Code = "COAG-01", TestFileId = testFile.Id, IsActive = true };
            await instrRepo.AddAsync(instrument);
            await uow.SaveChangesAsync();
            Console.WriteLine($"  + Instrument COAG-01 created     {instrument.Id}");
        }
        else Console.WriteLine($"  = Instrument COAG-01 exists      {instrument.Id}");

        // 4) QCSample (lot 507969, level 2)
        var sample = (await sampleRepo.FindAsync(s => s.LotNumber == LotNumber && s.Level == Level)).FirstOrDefault();
        if (sample is null)
        {
            sample = new QCSample
            {
                Name         = "Kontrol PT Level 2",
                LotNumber    = LotNumber,
                Level        = Level,
                ExpiryDate   = ExpiryDate,
                InstrumentId = instrument.Id,
                IsActive     = true,
                // within-material rules: 1:2s warning, 1:3s reject (entity defaults)
                Rule1_2s = true, Rule1_3s = true, RejectSD = 3.0, NxCount = 10,
            };
            await sampleRepo.AddAsync(sample);
            await uow.SaveChangesAsync();
            Console.WriteLine($"  + QCSample lot {LotNumber}/L{Level} created  {sample.Id}");
        }
        else Console.WriteLine($"  = QCSample lot {LotNumber}/L{Level} exists   {sample.Id}");

        // 5) QCSampleTarget (Mean/SD)
        var target = (await targetRepo.FindAsync(t => t.QCSampleId == sample.Id && t.TestFileParameterId == param.Id)).FirstOrDefault();
        if (target is null)
        {
            target = new QCSampleTarget
            {
                QCSampleId          = sample.Id,
                TestFileParameterId = param.Id,
                Mean                = TargetMean,
                SD                  = TargetSd,
                CV                  = Math.Round(TargetSd / TargetMean * 100, 2),
                TeaUnit             = "%",
            };
            await targetRepo.AddAsync(target);
            await uow.SaveChangesAsync();
            Console.WriteLine($"  + Target created  Mean={TargetMean}  SD={TargetSd}  CV={target.CV}%");
        }
        else Console.WriteLine($"  = Target exists   Mean={target.Mean}  SD={target.SD}");

        // 6) QCResults — import only if none exist yet for this sample+parameter
        var existingCount = await resultRepo.CountAsync(r => r.QCSampleId == sample.Id && r.TestFileParameterId == param.Id);
        if (existingCount > 0)
        {
            Console.WriteLine($"  = {existingCount} result(s) already present — result import skipped.");
            Console.WriteLine("── done ──────────────────────────────────────────────");
            return;
        }

        var rules = WestgardEvaluator.RulesOf(sample);
        var tally = new Dictionary<QCStatus, int>();
        foreach (var (date, value) in Points)
        {
            var eval = await westgard.EvaluateAsync(sample.Id, param.Id, value, target.Mean, target.SD, rules);
            await resultRepo.AddAsync(new QCResult
            {
                QCSampleId          = sample.Id,
                TestFileParameterId = param.Id,
                UserId              = null,            // auto-imported (no analyst)
                ResultDate          = date,
                Value               = value,
                ZScore              = eval.ZScore,
                Status              = eval.Status,
                WestgardFlags       = string.IsNullOrEmpty(eval.Flags) ? null : eval.Flags,
                Comment             = null,
            });
            await uow.SaveChangesAsync();      // save each point so it joins the history for the next evaluation

            tally[eval.Status] = tally.GetValueOrDefault(eval.Status) + 1;
            var flag = string.IsNullOrEmpty(eval.Flags) ? "" : $"  [{eval.Flags}]";
            Console.WriteLine($"  + {date:yyyy-MM-dd}  {value,5:0.0}  z={eval.ZScore,7:0.000}  {eval.Status}{flag}");
        }

        Console.WriteLine($"  Imported {Points.Length} PT results — " +
            string.Join(", ", tally.OrderBy(kv => kv.Key).Select(kv => $"{kv.Value} {kv.Key}")));
        Console.WriteLine("── done ──────────────────────────────────────────────");
    }
}
