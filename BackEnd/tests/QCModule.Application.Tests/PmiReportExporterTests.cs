using ClosedXML.Excel;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Validation;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Enums;
using QCModule.Infrastructure.Services;
using Xunit;

namespace QCModule.Application.Tests;

public class PmiReportExporterTests
{
    private static PmiReportModel SampleModel(IReadOnlyList<PmiReportRow> rows) => new(
        ParameterName:  "Glucose",
        Unit:           "mg/dL",
        SampleName:     "Multiqual L1",
        Level:          "Normal",
        LotNumber:      "LOT-12345",
        InstrumentName: "Cobas c501",
        Year:           2026,
        Month:          6,
        MonthLabel:     "Juni 2026",
        HasTarget:      true,
        Mean:           100,
        SD:             2,
        CV:             2,
        Minus2SD:       96,
        Plus2SD:        104,
        Rows:           rows);

    [Fact]
    public void Generate_FillsIdentityDailyValuesAndEvaluation()
    {
        var rows = new List<PmiReportRow>
        {
            new(new DateTime(2026, 6, 1),  101,   QCStatus.Accepted, null,   null),
            new(new DateTime(2026, 6, 18), 99,    QCStatus.Accepted, null,   null),
            new(new DateTime(2026, 6, 20), 110.5, QCStatus.Rejected, "1:3s", "Recalibrated"),
        };

        IPmiReportExporter exporter = new PmiReportExporter();
        var file = exporter.Generate(SampleModel(rows));

        Assert.EndsWith(".xlsx", file.FileName);
        Assert.NotEmpty(file.Content);

        using var ms = new MemoryStream(file.Content);
        using var wb = new XLWorkbook(ms);

        var ws = wb.Worksheet("Sheet2");
        Assert.Equal("Juni 2026", ws.Cell("AQ6").GetString());
        Assert.Equal("Glucose",   ws.Cell("BE6").GetString());
        Assert.Equal("Cobas c501", ws.Cell("AQ8").GetString());
        Assert.Equal("mg/dL",     ws.Cell("BE8").GetString());
        Assert.Equal("LOT-12345", ws.Cell("G8").GetString());
        Assert.Equal(100, ws.Cell("N8").GetDouble());
        // Daily grid: day 1 -> C11, day 18 -> E11, day 20 -> E13
        Assert.Equal(101,   ws.Cell("C11").GetDouble());
        Assert.Equal(99,    ws.Cell("E11").GetDouble());
        Assert.Equal(110.5, ws.Cell("E13").GetDouble());
        Assert.Equal(3,     ws.Cell("C28").GetDouble()); // Kumulasi (n)

        var pmi = wb.Worksheet("PMI");
        Assert.Equal("Cobas c501", pmi.Cell("B4").GetString());
        Assert.Equal("Juni 2026",  pmi.Cell("C4").GetString());
        // Day 20 -> row 25 (5 + 20)
        Assert.Equal("Ditolak",       pmi.Cell("B25").GetString());
        Assert.Equal("Acak (Random)", pmi.Cell("C25").GetString());
        Assert.Equal("1:3s",          pmi.Cell("D25").GetString());
        Assert.Equal("Recalibrated",  pmi.Cell("E25").GetString());

        // Grid plot: day 1 value 101 → z=0.5 → row 20-1=19, col G(7)
        Assert.Equal("●", ws.Cell(19, 7).GetString());
        // Chart data + chart sheets exist
        Assert.True(wb.TryGetWorksheet("Data LJ",   out _));
        Assert.True(wb.TryGetWorksheet("Grafik LJ", out _));
    }

    [Fact]
    public void Generate_ProducesSchemaValidXlsxWithChartPart()
    {
        var rows = new List<PmiReportRow>
        {
            new(new DateTime(2026, 6, 2),  100, QCStatus.Accepted, null, null),
            new(new DateTime(2026, 6, 9),  104, QCStatus.Warning,  "1:2s", null),
            new(new DateTime(2026, 6, 16), 95,  QCStatus.Rejected, "1:3s", "Fix"),
        };

        IPmiReportExporter exporter = new PmiReportExporter();
        var file = exporter.Generate(SampleModel(rows));

        using var ms = new MemoryStream(file.Content);
        using var doc = SpreadsheetDocument.Open(ms, false);

        // The Grafik LJ worksheet must own a chart part.
        var wbPart = doc.WorkbookPart!;
        var sheet  = wbPart.Workbook.Descendants<Sheet>().Single(s => s.Name == "Grafik LJ");
        var wsPart = (WorksheetPart)wbPart.GetPartById(sheet.Id!);
        Assert.NotEmpty(wsPart.DrawingsPart!.ChartParts);

        // Sheet2 must carry the connecting line: 3 points → 2 connectors.
        var s2     = wbPart.Workbook.Descendants<Sheet>().Single(s => s.Name == "Sheet2");
        var s2Part = (WorksheetPart)wbPart.GetPartById(s2.Id!);
        var connectors = s2Part.DrawingsPart!.WorksheetDrawing
            .Descendants<DocumentFormat.OpenXml.Drawing.Spreadsheet.ConnectionShape>().Count();
        Assert.Equal(2, connectors);

        // No OpenXML schema violations.
        var validator = new OpenXmlValidator();
        var errors = validator.Validate(doc).ToList();
        Assert.True(errors.Count == 0,
            "Schema errors:\n" + string.Join("\n", errors.Select(e => $"{e.Path?.XPath}: {e.Description}")));
    }
}
