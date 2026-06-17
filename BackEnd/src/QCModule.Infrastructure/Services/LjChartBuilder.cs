using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using A = DocumentFormat.OpenXml.Drawing;
using C = DocumentFormat.OpenXml.Drawing.Charts;
using Xdr = DocumentFormat.OpenXml.Drawing.Spreadsheet;

namespace QCModule.Infrastructure.Services;

/// <summary>
/// Injects a native Excel line chart (Levey-Jennings) into a worksheet of an already-built
/// .xlsx, referencing a data sheet. ClosedXML cannot author charts, so this uses the raw
/// OpenXML SDK as a post-processing pass.
/// </summary>
internal static class LjChartBuilder
{
    private const uint CatAxisId = 111_111_111U;
    private const uint ValAxisId = 222_222_222U;

    private record SeriesSpec(string Name, char Column, string ColorHex, bool Markers, bool Dashed);

    public static byte[] AddLineChart(byte[] xlsx, string chartSheetName, string dataSheetName, int dataRowCount, string title)
    {
        using var ms = new MemoryStream();
        ms.Write(xlsx, 0, xlsx.Length);
        ms.Position = 0;

        using (var doc = SpreadsheetDocument.Open(ms, true))
        {
            var wbPart = doc.WorkbookPart!;
            var sheet  = wbPart.Workbook.Descendants<Sheet>().First(s => s.Name == chartSheetName);
            var wsPart = (WorksheetPart)wbPart.GetPartById(sheet.Id!);

            var drawingsPart = wsPart.AddNewPart<DrawingsPart>();
            var chartPart    = drawingsPart.AddNewPart<ChartPart>();
            chartPart.ChartSpace = BuildChartSpace(dataSheetName, dataRowCount, title);

            BuildDrawing(drawingsPart, chartPart);

            // Link the worksheet to its drawing. Per the CT_Worksheet schema, <drawing> must
            // precede <tableParts>/<extLst>, so insert it before them rather than appending.
            wsPart.Worksheet.RemoveAllChildren<Drawing>();
            var drawing = new Drawing { Id = wsPart.GetIdOfPart(drawingsPart) };
            var tableParts = wsPart.Worksheet.GetFirstChild<TableParts>();
            if (tableParts is not null)
                wsPart.Worksheet.InsertBefore(drawing, tableParts);
            else
                wsPart.Worksheet.Append(drawing);
            wsPart.Worksheet.Save();
        }

        return ms.ToArray();
    }

    private static C.ChartSpace BuildChartSpace(string dataSheet, int rows, string title)
    {
        int last = rows + 1;                          // data occupies rows 2..rows+1
        string cat = $"'{dataSheet}'!$A$2:$A${last}"; // categories = dates

        var series = new[]
        {
            new SeriesSpec("Nilai", 'B', "1F4E79", Markers: true,  Dashed: false),
            new SeriesSpec("Mean",  'C', "2E7D32", Markers: false, Dashed: false),
            new SeriesSpec("+2SD",  'D', "FFC000", Markers: false, Dashed: true),
            new SeriesSpec("-2SD",  'E', "FFC000", Markers: false, Dashed: true),
            new SeriesSpec("+3SD",  'F', "C00000", Markers: false, Dashed: true),
            new SeriesSpec("-3SD",  'G', "C00000", Markers: false, Dashed: true),
        };

        var lineChart = new C.LineChart(
            new C.Grouping { Val = C.GroupingValues.Standard },
            new C.VaryColors { Val = false });

        for (uint i = 0; i < series.Length; i++)
            lineChart.Append(BuildSeries(i, series[i], dataSheet, last, cat));

        lineChart.Append(new C.ShowMarker { Val = true });
        lineChart.Append(new C.AxisId { Val = CatAxisId });
        lineChart.Append(new C.AxisId { Val = ValAxisId });

        var catAx = new C.CategoryAxis(
            new C.AxisId { Val = CatAxisId },
            new C.Scaling(new C.Orientation { Val = C.OrientationValues.MinMax }),
            new C.Delete { Val = false },
            new C.AxisPosition { Val = C.AxisPositionValues.Bottom },
            new C.CrossingAxis { Val = ValAxisId },
            new C.Crosses { Val = C.CrossesValues.AutoZero },
            new C.AutoLabeled { Val = true });

        var valAx = new C.ValueAxis(
            new C.AxisId { Val = ValAxisId },
            new C.Scaling(new C.Orientation { Val = C.OrientationValues.MinMax }),
            new C.Delete { Val = false },
            new C.AxisPosition { Val = C.AxisPositionValues.Left },
            new C.MajorGridlines(),
            new C.CrossingAxis { Val = CatAxisId },
            new C.Crosses { Val = C.CrossesValues.AutoZero });

        var chart = new C.Chart(
            BuildTitle(title),
            new C.AutoTitleDeleted { Val = false },
            new C.PlotArea(new C.Layout(), lineChart, catAx, valAx),
            new C.Legend(new C.LegendPosition { Val = C.LegendPositionValues.Bottom }, new C.Overlay { Val = false }),
            new C.PlotVisibleOnly { Val = true });

        var chartSpace = new C.ChartSpace(chart);
        chartSpace.AddNamespaceDeclaration("c", "http://schemas.openxmlformats.org/drawingml/2006/chart");
        chartSpace.AddNamespaceDeclaration("a", "http://schemas.openxmlformats.org/drawingml/2006/main");
        chartSpace.AddNamespaceDeclaration("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships");
        return chartSpace;
    }

    private static C.LineChartSeries BuildSeries(uint i, SeriesSpec s, string dataSheet, int last, string cat)
    {
        var valFormula  = $"'{dataSheet}'!${s.Column}$2:${s.Column}${last}";
        var nameFormula = $"'{dataSheet}'!${s.Column}$1";

        var outline = new A.Outline(new A.SolidFill(new A.RgbColorModelHex { Val = s.ColorHex })) { Width = 19050 };
        if (s.Dashed) outline.Append(new A.PresetDash { Val = A.PresetLineDashValues.Dash });

        var ser = new C.LineChartSeries(
            new C.Index { Val = i },
            new C.Order { Val = i },
            new C.SeriesText(new C.StringReference(new C.Formula(nameFormula))),
            new C.ChartShapeProperties(outline),
            new C.Marker(new C.Symbol { Val = s.Markers ? C.MarkerStyleValues.Circle : C.MarkerStyleValues.None },
                         new C.Size { Val = 5 }),
            new C.CategoryAxisData(new C.NumberReference(new C.Formula(cat))),
            new C.Values(new C.NumberReference(new C.Formula(valFormula))),
            new C.Smooth { Val = false });
        return ser;
    }

    private static C.Title BuildTitle(string text) => new(
        new C.ChartText(new C.RichText(
            new A.BodyProperties(),
            new A.ListStyle(),
            new A.Paragraph(new A.Run(
                new A.RunProperties { Language = "id-ID", FontSize = 1100, Bold = true },
                new A.Text(text))))),
        new C.Overlay { Val = false });

    private static void BuildDrawing(DrawingsPart drawingsPart, ChartPart chartPart)
    {
        var anchor = new Xdr.TwoCellAnchor(
            new Xdr.FromMarker(
                new Xdr.ColumnId("0"), new Xdr.ColumnOffset("0"),
                new Xdr.RowId("0"),    new Xdr.RowOffset("0")),
            new Xdr.ToMarker(
                new Xdr.ColumnId("14"), new Xdr.ColumnOffset("0"),
                new Xdr.RowId("28"),    new Xdr.RowOffset("0")),
            new Xdr.GraphicFrame(
                new Xdr.NonVisualGraphicFrameProperties(
                    new Xdr.NonVisualDrawingProperties { Id = 2U, Name = "LJ Chart" },
                    new Xdr.NonVisualGraphicFrameDrawingProperties()),
                new Xdr.Transform(
                    new A.Offset { X = 0L, Y = 0L },
                    new A.Extents { Cx = 0L, Cy = 0L }),
                new A.Graphic(new A.GraphicData(
                    new C.ChartReference { Id = drawingsPart.GetIdOfPart(chartPart) })
                { Uri = "http://schemas.openxmlformats.org/drawingml/2006/chart" })),
            new Xdr.ClientData());

        drawingsPart.WorksheetDrawing = new Xdr.WorksheetDrawing(anchor);
        drawingsPart.WorksheetDrawing.AddNamespaceDeclaration("xdr", "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing");
        drawingsPart.WorksheetDrawing.AddNamespaceDeclaration("a",   "http://schemas.openxmlformats.org/drawingml/2006/main");
        drawingsPart.WorksheetDrawing.Save();
    }
}
