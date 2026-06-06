using System.Globalization;

namespace QCModule.Infrastructure.Services;

public sealed class ResFileModel
{
    public string InstrumentCode { get; set; } = "";
    public string LotNumber      { get; set; } = "";
    public string Type           { get; set; } = "";
    public DateTime ReportDate   { get; set; }
    public List<(string TestCode, double Value)> Parameters { get; set; } = new();
}

public static class ResFileParser
{
    private static readonly string[] DateFormats = ["yyyyMMddHHmm", "yyyyMMddHHmmss", "yyyyMMdd"];

    public static ResFileModel? Parse(string filePath)
    {
        string[] lines;
        try { lines = File.ReadAllLines(filePath); }
        catch { return null; }

        var model   = new ResFileModel();
        var section = "";

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrEmpty(line)) continue;

            if (line.StartsWith('[') && line.EndsWith(']'))
            {
                section = line.ToUpperInvariant();
                continue;
            }

            var eqIdx = line.IndexOf('=');
            if (eqIdx < 0) continue;

            var key = line[..eqIdx].Trim().ToLowerInvariant();
            var val = line[(eqIdx + 1)..].Trim();

            if (section == "[OBR]")
            {
                switch (key)
                {
                    case "instrument_id": model.InstrumentCode = val; break;
                    case "sno_id":        model.LotNumber      = val; break;
                    case "type":          model.Type           = val.ToUpperInvariant(); break;
                    case "report_dt":
                        if (DateTime.TryParseExact(val, DateFormats, CultureInfo.InvariantCulture,
                            DateTimeStyles.None, out var dt))
                            model.ReportDate = dt;
                        break;
                }
            }
            else if (section == "[OBX]")
            {
                // key = obx1..obxN  |  val = WBC,6.77,,N,,,
                var parts = val.Split(',');
                if (parts.Length >= 2
                    && !string.IsNullOrWhiteSpace(parts[0])
                    && double.TryParse(parts[1], NumberStyles.Any, CultureInfo.InvariantCulture, out var value))
                {
                    model.Parameters.Add((parts[0].Trim(), value));
                }
            }
        }

        if (string.IsNullOrEmpty(model.InstrumentCode) || string.IsNullOrEmpty(model.LotNumber))
            return null;

        if (model.ReportDate == default)
            model.ReportDate = DateTime.Now;

        return model;
    }
}
