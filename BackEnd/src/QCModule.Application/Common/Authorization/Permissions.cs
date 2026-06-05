namespace QCModule.Application.Common.Authorization;

public static class Permissions
{
    public static class Users
    {
        public const string View   = "Permissions.Users.View";
        public const string Manage = "Permissions.Users.Manage";
    }

    public static class Instruments
    {
        public const string View   = "Permissions.Instruments.View";
        public const string Manage = "Permissions.Instruments.Manage";
    }

    public static class QCSamples
    {
        public const string View   = "Permissions.QCSamples.View";
        public const string Manage = "Permissions.QCSamples.Manage";
    }

    public static class QCResults
    {
        public const string Create = "Permissions.QCResults.Create";
        public const string Review = "Permissions.QCResults.Review";
        public const string Delete = "Permissions.QCResults.Delete";
    }

    public static class Reports
    {
        public const string View   = "Permissions.Reports.View";
        public const string Export = "Permissions.Reports.Export";
    }

    // Defines which roles hold which permissions.
    // Policies are auto-registered from this map at startup — see ServiceExtensions.
    public static readonly IReadOnlyDictionary<string, string[]> RolePermissions =
        new Dictionary<string, string[]>
        {
            ["Admin"] =
            [
                Users.View,    Users.Manage,
                Instruments.View, Instruments.Manage,
                QCSamples.View,   QCSamples.Manage,
                QCResults.Create, QCResults.Review, QCResults.Delete,
                Reports.View,  Reports.Export
            ],
            ["Supervisor"] =
            [
                Instruments.View,
                QCSamples.View, QCSamples.Manage,
                QCResults.Create, QCResults.Review,
                Reports.View,  Reports.Export
            ],
            ["Analyst"] =
            [
                Instruments.View,
                QCSamples.View,
                QCResults.Create,
                Reports.View
            ]
        };
}
