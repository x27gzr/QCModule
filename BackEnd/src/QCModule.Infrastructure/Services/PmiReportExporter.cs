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

    // Levey-Jennings grid geometry in the template (Sheet2, block 1):
    // mean line = row 20, ±2SD = rows 16/24 → 2 rows per SD; plot box spans rows 11-30.
    private const int    GridMeanRow  = 20;
    private const double GridRowsPerSd = 2.0;
    private const int    GridTopRow   = 11;
    private const int    GridBottomRow = 30;

    // Status colours (shared by grid dots).
    private const string ColAccepted = "#00B050";
    private const string ColWarning  = "#FFC000";
    private const string ColRejected = "#FF0000";
    private const string ColPending  = "#808080";

    // Chart-data sheet (feeds the native line chart).
    private const string DataSheet  = "Data LJ";
    private const string ChartSheet = "Grafik LJ";

    public FileExportResult Generate(PmiReportModel model)
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(TemplateResource)
            ?? throw new InvalidOperationException($"Embedded template '{TemplateResource}' not found.");

        var chartable = model.HasTarget && model.SD > 0 && model.Rows.Count > 0;

        byte[] bytes;
        List<(int Row, int Col)> gridLine;
        using (var wb = new XLWorkbook(stream))
        {
            gridLine = FillWorksheet(wb.Worksheet("Sheet2"), model, chartable);
            FillEvaluation(wb.Worksheet("PMI"),   model);
            if (chartable) BuildChartData(wb, model);

            using var output = new MemoryStream();
            wb.SaveAs(output);
            bytes = output.ToArray();
        }

        // ClosedXML cannot author charts/connectors → post-process with the OpenXML SDK:
        // a native line chart on "Grafik LJ" + a connecting line through the grid dots on Sheet2.
        if (chartable)
            bytes = LjChartBuilder.AddCharts(
                bytes, ChartSheet, DataSheet, model.Rows.Count,
                $"Levey-Jennings — {model.ParameterName} ({model.Level}) · {model.MonthLabel}",
                "Sheet2", gridLine);

        return new FileExportResult(bytes, "PMI.xlsx", XlsxContentType);
    }

    /// <summary>Hidden data sheet that backs the native line chart.</summary>
    private static void BuildChartData(XLWorkbook wb, PmiReportModel m)
    {
        var ws = wb.Worksheets.Add(DataSheet);
        string[] headers = ["Tanggal", "Nilai", "Mean", "+2SD", "-2SD", "+3SD", "-3SD"];
        for (var c = 0; c < headers.Length; c++) ws.Cell(1, c + 1).Value = headers[c];

        var plus3  = m.Mean + 3 * m.SD;
        var minus3 = m.Mean - 3 * m.SD;
        var r = 2;
        foreach (var row in m.Rows.OrderBy(x => x.Date))
        {
            ws.Cell(r, 1).Value = row.Date;
            ws.Cell(r, 2).Value = Round(row.Value);
            ws.Cell(r, 3).Value = Round(m.Mean);
            ws.Cell(r, 4).Value = Round(m.Plus2SD);
            ws.Cell(r, 5).Value = Round(m.Minus2SD);
            ws.Cell(r, 6).Value = Round(plus3);
            ws.Cell(r, 7).Value = Round(minus3);
            r++;
        }
        ws.Column(1).Style.NumberFormat.Format = "dd-mmm";
        ws.Hide();

        wb.Worksheets.Add(ChartSheet); // empty; the chart drawing is injected later
    }

    // ── Sheet2 : Levey-Jennings monthly worksheet ─────────────────────────────────
    // Returns the date-ordered grid coordinates of plotted points (for the connecting line).
    private static List<(int Row, int Col)> FillWorksheet(IXLWorksheet ws, PmiReportModel m, bool plot)
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

        // Plot each point onto the pre-printed grid: z-score → row, day → column.
        var points = new List<(int Row, int Col)>();
        if (plot && m.SD > 0)
        {
            foreach (var row in m.Rows.OrderBy(r => r.Date))
            {
                var day = row.Date.Day;
                if (day is < 1 or > 31) continue;

                var z       = (row.Value - m.Mean) / m.SD;
                var gridRow = Math.Clamp(
                    (int)Math.Round(GridMeanRow - GridRowsPerSd * z), GridTopRow, GridBottomRow);
                var gridCol = 7 + 2 * (day - 1); // date 1 → col G(7), 2 → I(9), … 31 → BO(67)

                var cell = ws.Cell(gridRow, gridCol);
                cell.Value = "●";
                cell.Style.Font.FontSize  = 8;
                cell.Style.Font.Bold      = true;
                cell.Style.Font.FontColor = XLColor.FromHtml(StatusColor(row.Status));
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical   = XLAlignmentVerticalValues.Center;

                points.Add((gridRow, gridCol));
            }
        }
        return points;
    }

    private static string StatusColor(QCStatus s) => s switch
    {
        QCStatus.Accepted => ColAccepted,
        QCStatus.Warning  => ColWarning,
        QCStatus.Rejected => ColRejected,
        _                 => ColPending,
    };

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
