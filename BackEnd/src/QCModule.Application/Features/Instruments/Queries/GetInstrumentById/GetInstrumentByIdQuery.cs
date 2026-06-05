using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Instruments.DTOs;

namespace QCModule.Application.Features.Instruments.Queries.GetInstrumentById;

public record GetInstrumentByIdQuery(Guid Id) : IRequest<Result<InstrumentDto>>;
