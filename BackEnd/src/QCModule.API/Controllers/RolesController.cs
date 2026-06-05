using Microsoft.AspNetCore.Mvc;
using QCModule.Application.Common.Models;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.API.Controllers;

[ApiController]
[Route("api/roles")]
public class RolesController(IRepository<Role> roleRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<Result<IEnumerable<RoleDto>>>> GetRoles(CancellationToken ct)
    {
        var roles = await roleRepo.GetAllAsync(ct);
        var dtos  = roles.OrderBy(r => r.Name)
                         .Select(r => new RoleDto(r.Id, r.Name, r.Description));
        return Ok(Result<IEnumerable<RoleDto>>.Success(dtos));
    }
}

public record RoleDto(Guid Id, string Name, string? Description);
