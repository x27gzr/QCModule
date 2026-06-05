namespace QCModule.Application.Features.QCSamples.DTOs;

public record QCSampleTargetDto(
    Guid    Id,
    Guid    QCSampleId,
    Guid    TestFileParameterId,
    string  ParameterName,
    string? Unit,
    double  Mean,
    double  SD,
    double  CV
);
