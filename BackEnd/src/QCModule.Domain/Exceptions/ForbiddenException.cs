namespace QCModule.Domain.Exceptions;

public class ForbiddenException(string message = "You do not have permission to perform this action.")
    : DomainException(message);
