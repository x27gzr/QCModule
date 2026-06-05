using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Enums;
using QCModule.Domain.Interfaces;

namespace QCModule.Infrastructure.Services;

public class WestgardService(IRepository<WestgardRule> ruleRepo) : IWestgardService
{
    public async Task<WestgardResult> EvaluateAsync(double value, double mean, double sd, CancellationToken ct = default)
    {
        var zScore = sd > 0 ? (value - mean) / sd : 0;
        var rules  = await ruleRepo.FindAsync(r => r.IsEnabled, ct);

        var flags        = new List<string>();
        var isRejection  = false;
        var isWarning    = false;

        foreach (var rule in rules.OrderBy(r => r.RuleCode))
        {
            var absZ = Math.Abs(zScore);
            var violated = rule.RuleCode switch
            {
                "1:3s" => absZ > 3.0,
                "1:2s" => absZ > 2.0,
                _      => false
            };

            if (!violated) continue;

            flags.Add(rule.RuleCode);
            if (rule.IsRejection) isRejection = true;
            if (rule.IsWarning)   isWarning   = true;
        }

        var status = isRejection ? QCStatus.Rejected
                   : isWarning   ? QCStatus.Warning
                   : flags.Count > 0 ? QCStatus.Warning
                   : QCStatus.Accepted;

        return new WestgardResult(status, string.Join(", ", flags), Math.Round(zScore, 3));
    }
}
