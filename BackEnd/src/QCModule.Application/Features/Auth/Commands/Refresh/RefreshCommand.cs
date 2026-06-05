using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Auth.DTOs;

namespace QCModule.Application.Features.Auth.Commands.Refresh;

public record RefreshCommand(string RefreshToken) : IRequest<Result<AuthTokens>>;
