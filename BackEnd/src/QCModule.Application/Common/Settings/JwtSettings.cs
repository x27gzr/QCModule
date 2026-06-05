namespace QCModule.Application.Common.Settings;

public class JwtSettings
{
    public int ExpiryMinutes        { get; set; } = 30;
    public int RefreshTokenExpiryDays { get; set; } = 7;
}
