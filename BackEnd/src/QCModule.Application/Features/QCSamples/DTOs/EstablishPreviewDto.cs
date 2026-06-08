namespace QCModule.Application.Features.QCSamples.DTOs;

/// <summary>One row of the Establish-Mean preview: current target vs values
/// calculated from QC results in the chosen date range.</summary>
public record EstablishPreviewDto(
    Guid    TestFileParameterId,
    string  ParameterName,
    string? Unit,
    bool    HasTarget,
    double? CurrentMean,
    double? CurrentSD,
    double? CurrentCV,
    int     N,            // number of in-control results in range
    double? CalcMean,
    double? CalcSD,
    double? CalcCV
);
