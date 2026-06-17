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

    // Grid cell geometry (Sheet2): columns G..BP are 2.0 chars ≈ 14 px wide; rows 11-30 are 12 pt.
    private const long GridColWidthEmu  = 14L * 9525L;  // px → EMU
    private const long GridRowHeightEmu = 12L * 12700L; // pt → EMU
    private const string GridLineColor  = "1F4E79";

    private record SeriesSpec(string Name, char Column, string ColorHex, bool Markers, bool Dashed);

    public static byte[] AddCharts(
        byte[] xlsx, string chartSheetName, string dataSheetName, int dataRowCount, string title,
        string gridSheetName, IReadOnlyList<(int Row, int Col)> gridLine)
    {
        using var ms = new MemoryStream();
        ms.Write(xlsx, 0, xlsx.Length);
        ms.Position = 0;

        using (var doc = SpreadsheetDocument.Open(ms, true))
        {
            var wbPart = doc.WorkbookPart!;

            // 1) Native line chart on the chart sheet.
            var chartWsPart  = GetWorksheetPart(wbPart, chartSheetName);
            var drawingsPart = chartWsPart.AddNewPart<DrawingsPart>();
            var chartPart    = drawingsPart.AddNewPart<ChartPart>();
            chartPart.ChartSpace = BuildChartSpace(dataSheetName, dataRowCount, title);
            BuildChartDrawing(drawingsPart, chartPart);
            LinkDrawing(chartWsPart, drawingsPart);

            // 2) Connecting line through the plotted dots on the form grid.
            // Sheet2 already owns a DrawingsPart in the template, so reuse it when present.
            if (gridLine.Count >= 2)
            {
                var gridWsPart = GetWorksheetPart(wbPart, gridSheetName);
                var existing   = gridWsPart.DrawingsPart;
                var part       = existing ?? gridWsPart.AddNewPart<DrawingsPart>();

                var wsDrawing = part.WorksheetDrawing;
                if (wsDrawing is null)
                {
                    wsDrawing = new Xdr.WorksheetDrawing();
                    wsDrawing.AddNamespaceDeclaration("xdr", "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing");
                    wsDrawing.AddNamespaceDeclaration("a",   "http://schemas.openxmlformats.org/drawingml/2006/main");
                    part.WorksheetDrawing = wsDrawing;
                }

                foreach (var anchor in BuildGridConnectors(gridLine)) wsDrawing.Append(anchor);
                wsDrawing.Save();

                if (existing is null) LinkDrawing(gridWsPart, part);
            }
        }

        return ms.ToArray();
    }

    private static WorksheetPart GetWorksheetPart(WorkbookPart wbPart, string sheetName)
    {
        var sheet = wbPart.Workbook.Descendants<Sheet>().First(s => s.Name == sheetName);
        return (WorksheetPart)wbPart.GetPartById(sheet.Id!);
    }

    /// <summary>Link a worksheet to its drawing. Per CT_Worksheet, &lt;drawing&gt; must precede &lt;tableParts&gt;.</summary>
    private static void LinkDrawing(WorksheetPart wsPart, DrawingsPart drawingsPart)
    {
        wsPart.Worksheet.RemoveAllChildren<Drawing>();
        var drawing = new Drawing { Id = wsPart.GetIdOfPart(drawingsPart) };
        var tableParts = wsPart.Worksheet.GetFirstChild<TableParts>();
        if (tableParts is not null) wsPart.Worksheet.InsertBefore(drawing, tableParts);
        else                        wsPart.Worksheet.Append(drawing);
        wsPart.Worksheet.Save();
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

    private static void BuildChartDrawing(DrawingsPart drawingsPart, ChartPart chartPart)
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

    /// <summary>
    /// One straight connector per consecutive pair of plotted dots, anchored to the cell centres.
    /// Points arrive date-ordered, so columns strictly increase left→right.
    /// </summary>
    private static IEnumerable<Xdr.TwoCellAnchor> BuildGridConnectors(IReadOnlyList<(int Row, int Col)> pts)
    {
        long halfW = GridColWidthEmu / 2;
        long halfH = GridRowHeightEmu / 2;

        for (var i = 0; i < pts.Count - 1; i++)
        {
            var (r1, c1) = pts[i];
            var (r2, c2) = pts[i + 1];

            // Bounding box top-left → bottom-right; flipV when the segment rises (r1 > r2).
            int topRow = Math.Min(r1, r2), botRow = Math.Max(r1, r2);
            bool flipV = r1 > r2;

            yield return new Xdr.TwoCellAnchor(
                new Xdr.FromMarker(
                    new Xdr.ColumnId((c1 - 1).ToString()), new Xdr.ColumnOffset(halfW.ToString()),
                    new Xdr.RowId((topRow - 1).ToString()), new Xdr.RowOffset(halfH.ToString())),
                new Xdr.ToMarker(
                    new Xdr.ColumnId((c2 - 1).ToString()), new Xdr.ColumnOffset(halfW.ToString()),
                    new Xdr.RowId((botRow - 1).ToString()), new Xdr.RowOffset(halfH.ToString())),
                BuildConnector((uint)(1000 + i), flipV),
                new Xdr.ClientData())
            { EditAs = Xdr.EditAsValues.OneCell };
        }
    }

    private static Xdr.ConnectionShape BuildConnector(uint id, bool flipV)
    {
        var xfrm = new A.Transform2D(new A.Offset { X = 0L, Y = 0L }, new A.Extents { Cx = 0L, Cy = 0L });
        if (flipV) xfrm.VerticalFlip = true;

        return new Xdr.ConnectionShape(
            new Xdr.NonVisualConnectionShapeProperties(
                new Xdr.NonVisualDrawingProperties { Id = id, Name = $"LJ Line {id}" },
                new Xdr.NonVisualConnectorShapeDrawingProperties()),
            new Xdr.ShapeProperties(
                xfrm,
                new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Line },
                new A.Outline(new A.SolidFill(new A.RgbColorModelHex { Val = GridLineColor })) { Width = 12700 }));
    }
}
