using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;

namespace QCModule.Application.Features.Users.Queries.GetUsers;

public record GetUsersQuery(
    string? Search   = null,
    Guid?   RoleId   = null,
    bool?   IsActive = null,
    int     Page     = 1,
    int     PageSize = 10
) : IRequest<Result<PaginatedResult<UserSummaryDto>>>;
