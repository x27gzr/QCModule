using QCModule.Domain.Entities;

namespace QCModule.Application.Common.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user, string roleName);
    Guid?  ValidateToken(string token);
}
