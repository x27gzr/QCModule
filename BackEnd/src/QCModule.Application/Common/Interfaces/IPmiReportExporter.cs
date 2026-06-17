using QCModule.Domain.Enums;

namespace QCModule.Application.Common.Interfaces;

/// <summary>
/// One QC result row used to fill the PMI report (daily grid + evaluation sheet).
/// </summary>
public record PmiReportRow(
    DateTime          Date,
    double            Value,
    QCStatus          Status,
    string?           WestgardFlags,
    string?           Comment);

/// <summary>
/// All data needed to render the RSUP Makassar "Lembar Kerja PMI" Excel form.
/// </summary>
public record PmiReportModel(
    string                    ParameterName,
    string?                   Unit,
    string                    SampleName,
    string                    Level,
    string                    LotNumber,
    string                    InstrumentName,
    int                       Year,
    int                       Month,
    string                    MonthLabel,
    bool                      HasTarget,
    double                    Mean,
    double                    SD,
    double                    CV,
    double                    Minus2SD,
    double                    Plus2SD,
    IReadOnlyList<PmiReportRow> Rows);

/// <summary>Result of generating a downloadable file.</summary>
public record FileExportResult(byte[] Content, string FileName, string ContentType);

/// <summary>
/// Renders QC data into the RSUP Makassar PMI Excel form (template-based).
/// </summary>
public interface IPmiReportExporter
{
    FileExportResult Generate(PmiReportModel model);
}
