using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;

namespace QCModule.Application.Common;

/// <summary>Pure within-material Westgard multirule evaluation.</summary>
public static class WestgardEvaluator
{
    public static WestgardRuleSet RulesOf(QCSample s) => new(
        s.Rule1_2s, s.Rule1_3s, s.Rule2_2s, s.Rule2_2sDiff, s.Rule4_1s, s.Rule10x, s.Rule7T,
        s.RejectSD, s.NxCount);

    /// <summary><paramref name="values"/> is oldest→newest; the newest item is the point being evaluated.</summary>
    public static WestgardResult Evaluate(IReadOnlyList<double> values, double mean, double sd, WestgardRuleSet r)
    {
        if (sd <= 0 || values.Count == 0)
            return new WestgardResult(QCStatus.Pending, string.Empty, 0);

        var n    = values.Count;
        var last = n - 1;
        var z    = new double[n];
        for (var i = 0; i < n; i++) z[i] = (values[i] - mean) / sd;
        var zl   = z[last];
        var absL = Math.Abs(zl);

        var flags   = new List<string>();
        var reject  = false;
        var warning = false;
        var rejectSd = r.RejectSD > 0 ? r.RejectSD : 3.0;

        // 1:Ns (reject) — single point beyond ±N SD
        if (r.Rule1_3s && absL > rejectSd)
        {
            flags.Add(Math.Abs(rejectSd - 3.0) < 0.001 ? "1:3s" : $"1:{rejectSd:0.#}s");
            reject = true;
        }
        // 1:2s (warning) — only when not already a reject by 1:Ns
        else if (r.Rule1_2s && absL > 2)
        {
            flags.Add("1:2s");
            warning = true;
        }

        // 2:2s — two consecutive both beyond 2SD, SAME side
        if (r.Rule2_2s && n >= 2 && absL > 2 && Math.Abs(z[last - 1]) > 2 && Math.Sign(zl) == Math.Sign(z[last - 1]))
        {
            flags.Add("2:2s");
            reject = true;
        }

        // R:4s (within-material) — two consecutive both beyond 2SD, DIFFERENT side
        if (r.Rule2_2sDiff && n >= 2 && absL > 2 && Math.Abs(z[last - 1]) > 2 && Math.Sign(zl) != Math.Sign(z[last - 1]))
        {
            flags.Add("R:4s");
            reject = true;
        }

        // 4:1s — four consecutive beyond 1SD, same side
        if (r.Rule4_1s && n >= 4)
        {
            var w = new[] { z[last], z[last - 1], z[last - 2], z[last - 3] };
            if (w.All(x => x > 1) || w.All(x => x < -1)) { flags.Add("4:1s"); reject = true; }
        }

        // N:x — N consecutive on the same side of the mean
        var nx = r.NxCount >= 2 ? r.NxCount : 10;
        if (r.Rule10x && n >= nx)
        {
            var window = Enumerable.Range(0, nx).Select(k => z[last - k]).ToArray();
            if (window.All(x => x > 0) || window.All(x => x < 0)) { flags.Add($"{nx}x"); reject = true; }
        }

        // 7T — seven consecutive strictly trending (increasing or decreasing) by raw value
        if (r.Rule7T && n >= 7)
        {
            bool inc = true, dec = true;
            for (var k = last - 6; k < last; k++)
            {
                if (!(values[k + 1] > values[k])) inc = false;
                if (!(values[k + 1] < values[k])) dec = false;
            }
            if (inc || dec) { flags.Add("7T"); reject = true; }
        }

        var status = reject ? QCStatus.Rejected : warning ? QCStatus.Warning : QCStatus.Accepted;
        return new WestgardResult(status, string.Join(", ", flags.Distinct()), Math.Round(zl, 3));
    }
}
