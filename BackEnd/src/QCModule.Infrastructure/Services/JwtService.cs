using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using QCModule.Application.Common.Interfaces;
using QCModule.Application.Common.Settings;
using QCModule.Domain.Entities;

namespace QCModule.Infrastructure.Services;

public class JwtService(IOptions<JwtSettings> jwtSettings) : IJwtService
{
    private readonly JwtSettings _settings = jwtSettings.Value;

    public string GenerateToken(User user, string roleName)
    {
        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name,  user.Name),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role,               roleName),
        };

        var token = new JwtSecurityToken(
            issuer:             _settings.Issuer,
            audience:           _settings.Audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpirationMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Guid? ValidateToken(string token)
    {
        try
        {
            var key = Encoding.UTF8.GetBytes(_settings.SecretKey);
            new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey         = new SymmetricSecurityKey(key),
                ValidateIssuer           = true,
                ValidIssuer              = _settings.Issuer,
                ValidateAudience         = true,
                ValidAudience            = _settings.Audience,
                ClockSkew                = TimeSpan.Zero
            }, out var validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;
            return Guid.Parse(jwtToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        }
        catch { return null; }
    }
}
