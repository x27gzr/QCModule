using System.Reflection;
using ClosedXML.Excel;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Enums;

namespace QCModule.Infrastructure.Services;

/// <summary>
/// Fills the RSUP Makassar "Lembar Kerja PMI" Excel form using the original file as a
/// template (embedded resource), so the layout/borders/merges match the paper form exactly.
/// </summary>
public class PmiReportExporter : IPmiReportExporter
{
    private const string TemplateResource = "QCModule.Infrastructure.Resources.PmiReportTemplate.xlsx";
    private const string XlsxContentType  = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    // Random-error vs systematic-error Westgard rule tokens (see WestgardEvaluator).
    // "1:" covers 1:2s / 1:3s / configurable 1:Ns; "x" covers 10x / Nx.
    private static readonly string[] RandomRules     = ["1:", "R:4s"];
    private static readonly string[] SystematicRules = ["2:2s", "4:1s", "7T", "x"];

    public FileExportResult Generate(PmiReportModel model)
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(TemplateResource)
            ?? throw new InvalidOperationException($"Embedded template '{TemplateResource}' not found.");

        using var wb = new XLWorkbook(stream);

        FillWorksheet(wb.Worksheet("Sheet2"), model);
        FillEvaluation(wb.Worksheet("PMI"),   model);

        using var output = new MemoryStream();
        wb.SaveAs(output);
        return new FileExportResult(output.ToArray(), "PMI.xlsx", XlsxContentType);
    }

    // ── Sheet2 : Levey-Jennings monthly worksheet ─────────────────────────────────
    private static void FillWorksheet(IXLWorksheet ws, PmiReportModel m)
    {
        // Identity block (row 6-8 value cells; labels are pre-printed in the template)
        ws.Cell("AQ6").Value = m.MonthLabel;       // Bulan
        ws.Cell("BE6").Value = m.ParameterName;    // Pemeriksaan
        ws.Cell("AQ8").Value = m.InstrumentName;   // Instrumen
        ws.Cell("BE8").Value = m.Unit ?? string.Empty; // Satuan

        // Kontrol Serum block
        ws.Cell("B8").Value = $"{m.SampleName} / {m.Level}"; // Normal / Patologis slot
        ws.Cell("G8").Value = m.LotNumber;                   // No.Lot
        if (m.HasTarget)
        {
            ws.Cell("N8").Value = Round(m.Mean);                                  // Nilai Rata-rata
            ws.Cell("V8").Value = $"{Round(m.Minus2SD)} – {Round(m.Plus2SD)}";    // Batas Peringatan (X±2SD)
        }

        // Daily values: day 1-17 → column C (rows 11-27); day 18-31 → column E (rows 11-24)
        foreach (var row in m.Rows)
        {
            var day = row.Date.Day;
            if (day is >= 1 and <= 17)
                ws.Cell(10 + day, 3).Value = Round(row.Value);   // C
            else if (day is >= 18 and <= 31)
                ws.Cell(day - 7, 5).Value = Round(row.Value);    // E (18→row11 … 31→row24)
        }

        // Statistics (column C, rows 28-31)
        var values = m.Rows.Select(r => r.Value).ToList();
        ws.Cell("C28").Value = values.Count;                         // Kumulasi (n)
        if (m.HasTarget)
        {
            ws.Cell("C29").Value = Round(m.Mean); // X
            ws.Cell("C30").Value = Round(m.SD);   // SD
            ws.Cell("C31").Value = Round(m.CV);   // CV
        }
        else if (values.Count > 0)
        {
            var mean = values.Average();
            var sd   = values.Count > 1 ? Math.Sqrt(values.Sum(v => Math.Pow(v - mean, 2)) / (values.Count - 1)) : 0;
            ws.Cell("C29").Value = Round(mean);
            ws.Cell("C30").Value = Round(sd);
            ws.Cell("C31").Value = mean != 0 ? Round(sd / mean * 100) : 0;
        }
    }

    // ── PMI : monthly evaluation table (column A pre-numbered 1.-31. = day of month) ─
    private static void FillEvaluation(IXLWorksheet ws, PmiReportModel m)
    {
        ws.Cell("B4").Value = m.InstrumentName;                                          // ALAT
        ws.Cell("C4").Value = m.MonthLabel;                                              // BULAN
        ws.Cell("D4").Value = m.Unit is null ? m.ParameterName : $"{m.ParameterName} ({m.Unit})"; // TES

        foreach (var row in m.Rows)
        {
            var day = row.Date.Day;
            if (day is < 1 or > 31) continue;
            var r = 5 + day; // A6 = "1." … A36 = "31."

            ws.Cell(r, 2).Value = StatusText(row.Status);                  // HASIL EVALUASI
            var hasFlags = !string.IsNullOrWhiteSpace(row.WestgardFlags);
            ws.Cell(r, 3).Value = hasFlags ? ErrorType(row.WestgardFlags!) : "-";  // JENIS KESALAHAN
            ws.Cell(r, 4).Value = hasFlags ? row.WestgardFlags! : "-";            // KETENTUAN PENOLAKAN/PERINGATAN
            ws.Cell(r, 5).Value = row.Comment ?? string.Empty;                    // LANGKAH PEMECAHAN MASALAH
        }
    }

    private static string StatusText(QCStatus s) => s switch
    {
        QCStatus.Accepted => "Diterima",
        QCStatus.Warning  => "Peringatan",
        QCStatus.Rejected => "Ditolak",
        _                 => "Menunggu",
    };

    private static string ErrorType(string flags)
    {
        var random     = RandomRules.Any(flags.Contains);
        var systematic = SystematicRules.Any(flags.Contains);
        return (random, systematic) switch
        {
            (true, true)  => "Acak & Sistematik",
            (true, false) => "Acak (Random)",
            (false, true) => "Sistematik",
            _             => "-",
        };
    }

    private static double Round(double v) => Math.Round(v, 3);
}
