using QCModule.Application.Common;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Infrastructure.Services;

/// <summary>
/// Within-material Westgard evaluation: pulls this sample+parameter's result history,
/// appends the new value as the newest point, and runs the pure multirule evaluator.
/// </summary>
public class WestgardService(IRepository<QCResult> resultRepo) : IWestgardService
{
    public async Task<WestgardResult> EvaluateAsync(
        Guid              qcSampleId,
        Guid              testFileParameterId,
        double            newValue,
        double            mean,
        double            sd,
        WestgardRuleSet   rules,
        Guid?             excludeResultId = null,
        CancellationToken ct = default)
    {
        // Prior points for this level's chart, oldest→newest.
        // (FindAsync already excludes soft-deleted results via the global query filter.)
        var history = await resultRepo.FindAsync(
            r => r.QCSampleId == qcSampleId
              && r.TestFileParameterId == testFileParameterId
              && (excludeResultId == null || r.Id != excludeResultId),
            ct);

        var series = history
            .OrderBy(r => r.ResultDate)
            .ThenBy(r => r.CreatedAt)
            .Select(r => r.Value)
            .ToList();

        series.Add(newValue); // the point being evaluated is always the newest

        return WestgardEvaluator.Evaluate(series, mean, sd, rules);
    }
}
