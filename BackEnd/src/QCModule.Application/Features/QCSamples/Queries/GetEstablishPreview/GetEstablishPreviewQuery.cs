using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.QCSamples.DTOs;

namespace QCModule.Application.Features.QCSamples.Queries.GetEstablishPreview;

public record GetEstablishPreviewQuery(
    Guid      QCSampleId,
    DateTime? DateFrom,
    DateTime? DateTo
) : IRequest<Result<IReadOnlyList<EstablishPreviewDto>>>;
