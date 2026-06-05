using System.Text.RegularExpressions;
using MediatR;
using QCModule.Application.Common.Interfaces;
using QCModule.Domain.Entities;
using QCModule.Domain.Interfaces;

namespace QCModule.Application.Common.Behaviors;

/// <summary>
/// Automatically records an ActivityLog entry for every successful Command
/// (requests whose type name ends with "Command"). Queries are ignored.
/// Failures here never affect the underlying operation.
/// </summary>
public partial class ActivityLogBehavior<TRequest, TResponse>(
    IRepository<ActivityLog> logRepo,
    IUnitOfWork              unitOfWork,
    ICurrentUserService      currentUser)
    : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    // Refresh fires every ~30 min per user — too noisy to audit.
    private static readonly HashSet<string> Ignored = new() { "RefreshCommand" };

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var response = await next(cancellationToken);

        var name = typeof(TRequest).Name;
        if (name.EndsWith("Command") && !Ignored.Contains(name))
        {
            try
            {
                var (action, module) = Derive(name);

                await logRepo.AddAsync(new ActivityLog
                {
                    UserId      = currentUser.UserId,
                    Action      = action,
                    EntityType  = module,
                    EntityId    = TryGetId(request),
                    Description  = $"{action} {module}".Trim(),
                    IpAddress   = currentUser.IpAddress
                }, cancellationToken);

                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                // Audit logging must never break the primary operation.
            }
        }

        return response;
    }

    private static (string action, string module) Derive(string commandName)
    {
        var core  = commandName.EndsWith("Command") ? commandName[..^"Command".Length] : commandName;
        var words = PascalCase().Matches(core).Select(m => m.Value).ToList();
        if (words.Count == 0) return ("Action", "General");

        var action = words[0];
        var module = words.Count > 1 ? string.Concat(words.Skip(1)) : "Auth";
        return (action, module);
    }

    private static string? TryGetId(TRequest request)
    {
        var prop = typeof(TRequest).GetProperty("Id");
        var val  = prop?.GetValue(request);
        return val?.ToString();
    }

    // Splits PascalCase, keeping acronyms together (e.g. "QC" in "QCResult").
    [GeneratedRegex("[A-Z]+(?=[A-Z][a-z])|[A-Z][a-z]*|[A-Z]+")]
    private static partial Regex PascalCase();
}
