using MediatR;
using QCModule.Application.Common.Models;
using QCModule.Application.Features.Users.DTOs;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Features.Users.Queries.GetUsers;

public class GetUsersQueryHandler(
    IRepository<User> userRepo,
    IRepository<Role> roleRepo)
    : IRequestHandler<GetUsersQuery, Result<PaginatedResult<UserSummaryDto>>>
{
    public async Task<Result<PaginatedResult<UserSummaryDto>>> Handle(
        GetUsersQuery request, CancellationToken cancellationToken)
    {
        var users   = await userRepo.GetAllAsync(cancellationToken);
        var roles   = await roleRepo.GetAllAsync(cancellationToken);
        var roleMap = roles.ToDictionary(r => r.Id, r => r.Name);

        var query = users.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(term)
                                  || u.Email.ToLower().Contains(term));
        }

        if (request.RoleId.HasValue)
            query = query.Where(u => u.RoleId == request.RoleId.Value);

        if (request.IsActive.HasValue)
            query = query.Where(u => u.IsActive == request.IsActive.Value);

        var ordered    = query.OrderBy(u => u.Name).ToList();
        var totalCount = ordered.Count;
        var pageSize   = Math.Clamp(request.PageSize, 1, 50);
        var page       = Math.Max(request.Page, 1);

        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserSummaryDto(
                u.Id, u.Name, u.Email,
                roleMap.GetValueOrDefault(u.RoleId, "Unknown"),
                u.IsActive))
            .ToList();

        return Result<PaginatedResult<UserSummaryDto>>.Success(new PaginatedResult<UserSummaryDto>
        {
            Items      = items,
            TotalCount = totalCount,
            PageNumber = page,
            PageSize   = pageSize
        });
    }
}
