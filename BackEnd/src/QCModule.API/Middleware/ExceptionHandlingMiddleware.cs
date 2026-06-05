using System.Diagnostics;
using System.Net;
using System.Text.Json;
using QCModule.Application.Common.Exceptions;
using QCModule.Domain.Exceptions;
using Serilog.Context;

namespace QCModule.API.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly IDictionary<string, string[]> NoFieldErrors = new Dictionary<string, string[]>();

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        var (statusCode, message, fieldErrors) = MapException(exception);
        var isServerError = (int)statusCode >= 500;

        using (LogContext.PushProperty("TraceId", traceId))
        using (LogContext.PushProperty("StatusCode", (int)statusCode))
        using (LogContext.PushProperty("RequestMethod", context.Request.Method))
        using (LogContext.PushProperty("RequestPath", context.Request.Path.Value))
        using (LogContext.PushProperty("UserId", context.User.FindFirst("sub")?.Value ?? "anonymous"))
        {
            if (isServerError)
                logger.LogError(exception,
                    "Unhandled exception | {RequestMethod} {RequestPath} | Status {StatusCode} | TraceId {TraceId}",
                    context.Request.Method, context.Request.Path, (int)statusCode, traceId);
            else
                logger.LogWarning(
                    "Expected exception [{ExceptionType}] | {RequestMethod} {RequestPath} | Status {StatusCode} | {Message} | TraceId {TraceId}",
                    exception.GetType().Name, context.Request.Method, context.Request.Path, (int)statusCode, exception.Message, traceId);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            succeeded = false,
            message,
            errors = fieldErrors,
            traceId
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
    }

    private static (HttpStatusCode status, string message, IDictionary<string, string[]> errors) MapException(Exception exception) =>
        exception switch
        {
            ValidationException ve => (
                HttpStatusCode.UnprocessableEntity,
                "One or more validation errors occurred.",
                ve.Errors),

            NotFoundException nfe => (
                HttpStatusCode.NotFound,
                nfe.Message,
                NoFieldErrors),

            ConflictException ce => (
                HttpStatusCode.Conflict,
                ce.Message,
                NoFieldErrors),

            ForbiddenException fe => (
                HttpStatusCode.Forbidden,
                fe.Message,
                NoFieldErrors),

            DomainException de => (
                HttpStatusCode.BadRequest,
                de.Message,
                NoFieldErrors),

            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                "Authentication is required to access this resource.",
                NoFieldErrors),

            _ => (
                HttpStatusCode.InternalServerError,
                "An unexpected error occurred. Please contact support with the provided trace ID.",
                NoFieldErrors)
        };
}
