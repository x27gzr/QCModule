using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Auth.DTOs;

namespace QCModule.Application.Features.Auth.Commands.Login;

public record LoginCommand(string Email, string Password) : IRequest<Result<AuthTokens>>;
