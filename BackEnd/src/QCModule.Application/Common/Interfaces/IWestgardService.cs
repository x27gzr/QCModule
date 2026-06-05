using QCModule.Domain.Enums;

namespace QCModule.Application.Common.Interfaces;

public record WestgardResult(QCStatus Status, string Flags, double ZScore);

public interface IWestgardService
{
    Task<WestgardResult> EvaluateAsync(
        double value,
        double mean,
        double sd,
        CancellationToken ct = default);
}
