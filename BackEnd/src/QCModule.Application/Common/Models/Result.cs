namespace QCModule.Application.Common.Models;

public class Result<T>
{
    public bool Succeeded { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public IEnumerable<string> Errors { get; set; } = Enumerable.Empty<string>();

    public static Result<T> Success(T data, string? message = null) =>
        new() { Succeeded = true, Data = data, Message = message };

    public static Result<T> Failure(string error) =>
        new() { Succeeded = false, Errors = [error] };

    public static Result<T> Failure(IEnumerable<string> errors) =>
        new() { Succeeded = false, Errors = errors };
}
