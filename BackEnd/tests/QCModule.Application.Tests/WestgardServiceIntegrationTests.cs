using Microsoft.EntityFrameworkCore;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Infrastructure.Persistence;
using QCModule.Infrastructure.Persistence.Repositories;
using QCModule.Infrastructure.Services;
using Xunit;

namespace QCModule.Application.Tests;

/// <summary>
/// Integration tests for WestgardService against a real ApplicationDbContext
/// (EF Core InMemory) + the production GenericRepository. These exercise the
/// parts the pure-evaluator unit tests cannot: loading the sample+parameter
/// history from the database, chronological ordering, soft-delete filtering,
/// and excludeResultId during edits.
/// Convention: mean = 100, sd = 10, so z = (value - 100) / 10.
/// </summary>
public class WestgardServiceIntegrationTests
{
    private const double Mean = 100;
    private const double Sd   = 10;

    private static readonly Guid SampleId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ParamId  = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTime T0 = new(2026, 1, 1, 8, 0, 0, DateTimeKind.Utc);

    private static WestgardRuleSet Rules(
        bool r12 = false, bool r13 = false, bool r22 = false, bool r22d = false,
        bool r41 = false, bool r10x = false, bool r7t = false,
        double rejectSd = 3.0, int nx = 10)
        => new(r12, r13, r22, r22d, r41, r10x, r7t, rejectSd, nx);

    private static ApplicationDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"westgard-{Guid.NewGuid()}")
            .Options;
        var ctx = new ApplicationDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static QCResult Result(
        double value, int minutesAfterT0,
        Guid? sampleId = null, Guid? paramId = null, bool deleted = false, Guid? id = null)
        => new()
        {
            Id                  = id ?? Guid.NewGuid(),
            QCSampleId          = sampleId ?? SampleId,
            TestFileParameterId = paramId  ?? ParamId,
            Value               = value,
            ResultDate          = T0.AddMinutes(minutesAfterT0),
            Status              = QCStatus.Accepted,
            IsDeleted           = deleted,
        };

    private static async Task<WestgardResult> Evaluate(
        ApplicationDbContext ctx, double newValue, WestgardRuleSet rules, Guid? excludeId = null)
    {
        var service = new WestgardService(new GenericRepository<QCResult>(ctx));
        return await service.EvaluateAsync(SampleId, ParamId, newValue, Mean, Sd, rules, excludeId);
    }

    // ── Empty history ─────────────────────────────────────────────────────────

    [Fact]
    public async Task No_history_evaluates_the_single_new_point()
    {
        using var ctx = NewContext();
        var res = await Evaluate(ctx, 131, Rules(r13: true)); // z = 3.1
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("1:3s", res.Flags);
    }

    // ── History is loaded and the new value is appended as newest ─────────────

    [Fact]
    public async Task Loads_history_and_appends_new_value_for_2_2s()
    {
        using var ctx = NewContext();
        ctx.QCResults.Add(Result(121, 0)); // z = 2.1, in DB
        await ctx.SaveChangesAsync();

        var res = await Evaluate(ctx, 122, Rules(r22: true)); // appended z = 2.2
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("2:2s", res.Flags);
    }

    // ── History must be ordered by ResultDate, not insertion order ────────────

    [Fact]
    public async Task Orders_history_by_result_date_for_7T_trend()
    {
        using var ctx = NewContext();
        // A rising trend by DATE, but inserted in scrambled order.
        ctx.QCResults.AddRange(
            Result(98, 50),
            Result(90, 10),
            Result(96, 40),
            Result(92, 20),
            Result(100, 60),
            Result(94, 30));
        await ctx.SaveChangesAsync();

        // newest appended = 102 → full series [90,92,94,96,98,100,102] strictly rising
        var res = await Evaluate(ctx, 102, Rules(r7t: true));
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("7T", res.Flags);
    }

    // ── excludeResultId removes the edited point from its own history ─────────

    [Fact]
    public async Task Exclude_result_id_drops_edited_point_so_4_1s_triggers()
    {
        using var ctx = NewContext();
        var editedId = Guid.NewGuid();
        ctx.QCResults.AddRange(
            Result(111, 10),                 // z 1.1
            Result(112, 20),                 // z 1.2
            Result(113, 30),                 // z 1.3
            Result(105, 40, id: editedId));  // z 0.5 — the point being edited
        await ctx.SaveChangesAsync();

        // Re-evaluate the edited point as 114, excluding its old value:
        // history = [111,112,113] + new 114 → four consecutive >1SD
        var res = await Evaluate(ctx, 114, Rules(r41: true), excludeId: editedId);
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("4:1s", res.Flags);
    }

    [Fact]
    public async Task Without_exclude_same_data_does_not_trigger_4_1s()
    {
        using var ctx = NewContext();
        ctx.QCResults.AddRange(
            Result(111, 10),
            Result(112, 20),
            Result(113, 30),
            Result(105, 40));            // in-control point left in the series
        await ctx.SaveChangesAsync();

        // history = [111,112,113,105] + new 114 → trailing 4-window breaks on 105
        var res = await Evaluate(ctx, 114, Rules(r41: true));
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── Soft-deleted history is ignored (global query filter) ─────────────────

    [Fact]
    public async Task Soft_deleted_history_is_excluded()
    {
        using var ctx = NewContext();
        ctx.QCResults.Add(Result(121, 0, deleted: true)); // would form 2:2s if counted
        await ctx.SaveChangesAsync();

        var res = await Evaluate(ctx, 122, Rules(r22: true)); // only [122] remains → no pair
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── History is scoped to this sample + parameter ──────────────────────────

    [Fact]
    public async Task History_is_filtered_by_sample_and_parameter()
    {
        using var ctx = NewContext();
        // Same parameter but a DIFFERENT sample — must not leak into this series.
        ctx.QCResults.Add(Result(121, 0, sampleId: Guid.NewGuid()));
        // Same sample but a DIFFERENT parameter — must not leak either.
        ctx.QCResults.Add(Result(121, 0, paramId: Guid.NewGuid()));
        await ctx.SaveChangesAsync();

        var res = await Evaluate(ctx, 122, Rules(r22: true)); // our series is just [122]
        Assert.Equal(QCStatus.Accepted, res.Status);
    }
}
