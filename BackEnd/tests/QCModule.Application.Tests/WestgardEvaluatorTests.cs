using QCModule.Application.Common;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Enums;
using Xunit;

namespace QCModule.Application.Tests;

/// <summary>
/// Unit tests for the pure within-material Westgard engine.
/// Convention used everywhere: mean = 100, sd = 10, so z = (value - 100) / 10.
/// Values are oldest→newest; the LAST value is the point being evaluated.
/// </summary>
public class WestgardEvaluatorTests
{
    private const double Mean = 100;
    private const double Sd   = 10;

    // Build a rule set with only the rules under test switched on.
    private static WestgardRuleSet Rules(
        bool r12 = false, bool r13 = false, bool r22 = false, bool r22d = false,
        bool r41 = false, bool r10x = false, bool r7t = false,
        double rejectSd = 3.0, int nx = 10)
        => new(r12, r13, r22, r22d, r41, r10x, r7t, rejectSd, nx);

    private static WestgardResult Eval(IReadOnlyList<double> v, WestgardRuleSet r)
        => WestgardEvaluator.Evaluate(v, Mean, Sd, r);

    // ── Guard conditions ──────────────────────────────────────────────────────

    [Fact]
    public void Pending_when_sd_is_zero()
    {
        var res = WestgardEvaluator.Evaluate(new[] { 100.0 }, Mean, 0, Rules(r13: true));
        Assert.Equal(QCStatus.Pending, res.Status);
    }

    [Fact]
    public void Pending_when_no_values()
    {
        var res = WestgardEvaluator.Evaluate(Array.Empty<double>(), Mean, Sd, Rules(r13: true));
        Assert.Equal(QCStatus.Pending, res.Status);
    }

    [Fact]
    public void Accepted_when_in_control()
    {
        // z = 0.5, nothing violated even with every rule enabled
        var res = Eval(new[] { 105.0 }, Rules(true, true, true, true, true, true, true));
        Assert.Equal(QCStatus.Accepted, res.Status);
        Assert.Equal(string.Empty, res.Flags);
    }

    [Fact]
    public void Disabled_rules_never_flag()
    {
        // z = 3.5 but every rule is off → Accepted
        var res = Eval(new[] { 135.0 }, Rules());
        Assert.Equal(QCStatus.Accepted, res.Status);
        Assert.Equal(string.Empty, res.Flags);
    }

    // ── 1:2s (warning) ────────────────────────────────────────────────────────

    [Fact]
    public void Rule_1_2s_warns_between_2_and_3_sd()
    {
        var res = Eval(new[] { 121.0 }, Rules(r12: true, r13: true)); // z = 2.1
        Assert.Equal(QCStatus.Warning, res.Status);
        Assert.Equal("1:2s", res.Flags);
    }

    [Fact]
    public void Rule_1_2s_not_warned_when_within_2sd()
    {
        var res = Eval(new[] { 119.0 }, Rules(r12: true)); // z = 1.9
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── 1:Ns (reject, configurable SD) ────────────────────────────────────────

    [Fact]
    public void Rule_1_3s_rejects_beyond_3sd()
    {
        var res = Eval(new[] { 131.0 }, Rules(r13: true)); // z = 3.1
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("1:3s", res.Flags);
    }

    [Fact]
    public void Rule_1_Ns_uses_custom_reject_sd_and_labels_it()
    {
        // rejectSd = 2.5, z = 2.6 → reject and flag should read "1:2.5s"
        var res = Eval(new[] { 126.0 }, Rules(r13: true, rejectSd: 2.5));
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("1:2.5s", res.Flags);
    }

    [Fact]
    public void Rule_1_3s_takes_priority_over_1_2s_warning()
    {
        var res = Eval(new[] { 131.0 }, Rules(r12: true, r13: true)); // z = 3.1
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("1:3s", res.Flags); // not "1:2s"
    }

    // ── 2:2s (same side) ──────────────────────────────────────────────────────

    [Fact]
    public void Rule_2_2s_rejects_two_consecutive_same_side()
    {
        var res = Eval(new[] { 121.0, 122.0 }, Rules(r22: true)); // z 2.1, 2.2
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("2:2s", res.Flags);
    }

    [Fact]
    public void Rule_2_2s_ignored_when_different_side()
    {
        var res = Eval(new[] { 121.0, 79.0 }, Rules(r22: true)); // z 2.1, -2.1
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── R:4s (2 consecutive outside 2SD, opposite sides) ──────────────────────

    [Fact]
    public void Rule_R_4s_rejects_two_consecutive_opposite_side()
    {
        var res = Eval(new[] { 122.0, 79.0 }, Rules(r22d: true)); // z 2.2, -2.1
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("R:4s", res.Flags);
    }

    [Fact]
    public void Rule_R_4s_ignored_when_same_side()
    {
        var res = Eval(new[] { 121.0, 122.0 }, Rules(r22d: true)); // z 2.1, 2.2
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── 4:1s ──────────────────────────────────────────────────────────────────

    [Fact]
    public void Rule_4_1s_rejects_four_consecutive_outside_1sd_same_side()
    {
        var res = Eval(new[] { 111.0, 112.0, 113.0, 114.0 }, Rules(r41: true)); // z 1.1..1.4
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("4:1s", res.Flags);
    }

    [Fact]
    public void Rule_4_1s_not_triggered_with_only_three_outside_1sd()
    {
        // newest is within 1SD, so the trailing 4-window fails
        var res = Eval(new[] { 111.0, 112.0, 113.0, 105.0 }, Rules(r41: true));
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── N:x (configurable count) ──────────────────────────────────────────────

    [Fact]
    public void Rule_10x_rejects_ten_consecutive_same_side()
    {
        var v = Enumerable.Repeat(101.0, 10).ToArray(); // all just above mean
        var res = Eval(v, Rules(r10x: true)); // nx defaults to 10
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("10x", res.Flags);
    }

    [Fact]
    public void Rule_Nx_uses_custom_count_and_labels_it()
    {
        var v = Enumerable.Repeat(99.0, 6).ToArray(); // all just below mean
        var res = Eval(v, Rules(r10x: true, nx: 6));
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("6x", res.Flags);
    }

    [Fact]
    public void Rule_Nx_not_triggered_when_a_point_crosses_mean()
    {
        var v = new[] { 101.0, 101.0, 101.0, 101.0, 99.0, 101.0, 101.0, 101.0, 101.0, 101.0 };
        var res = Eval(v, Rules(r10x: true));
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── 7T (trend) ────────────────────────────────────────────────────────────

    [Fact]
    public void Rule_7T_rejects_seven_point_rising_trend()
    {
        var v = new[] { 90.0, 92.0, 94.0, 96.0, 98.0, 100.0, 102.0 }; // strictly increasing
        var res = Eval(v, Rules(r7t: true));
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("7T", res.Flags);
    }

    [Fact]
    public void Rule_7T_rejects_seven_point_falling_trend()
    {
        var v = new[] { 110.0, 108.0, 106.0, 104.0, 102.0, 100.0, 98.0 }; // strictly decreasing
        var res = Eval(v, Rules(r7t: true));
        Assert.Equal(QCStatus.Rejected, res.Status);
        Assert.Equal("7T", res.Flags);
    }

    [Fact]
    public void Rule_7T_not_triggered_when_trend_breaks()
    {
        var v = new[] { 90.0, 92.0, 94.0, 93.0, 98.0, 100.0, 102.0 }; // dip at index 3
        var res = Eval(v, Rules(r7t: true));
        Assert.Equal(QCStatus.Accepted, res.Status);
    }

    // ── Z-score reporting ─────────────────────────────────────────────────────

    [Fact]
    public void Reports_rounded_z_of_newest_point()
    {
        var res = Eval(new[] { 100.0, 113.0 }, Rules(r12: true)); // newest z = 1.3
        Assert.Equal(1.3, res.ZScore, 3);
    }
}
