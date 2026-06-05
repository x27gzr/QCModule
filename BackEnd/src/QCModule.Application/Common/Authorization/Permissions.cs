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
        public const string View      = "Permissions.QCResults.View";
        public const string Create    = "Permissions.QCResults.Create";
        public const string Validate  = "Permissions.QCResults.Validate";   // Stage 1: analyst
        public const string Authorise = "Permissions.QCResults.Authorise";  // Stage 2: doctor
        public const string Delete    = "Permissions.QCResults.Delete";
    }

    public static class Reports
    {
        public const string View   = "Permissions.Reports.View";
        public const string Export = "Permissions.Reports.Export";
    }

    public static class ActivityLogs
    {
        public const string View = "Permissions.ActivityLogs.View";
    }

    public static class Settings
    {
        public const string Manage = "Permissions.Settings.Manage";
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
                QCResults.View,   QCResults.Create, QCResults.Validate, QCResults.Authorise, QCResults.Delete,
                Reports.View,  Reports.Export,
                ActivityLogs.View,
                Settings.Manage
            ],
            ["Supervisor"] =
            [
                Instruments.View,
                QCSamples.View, QCSamples.Manage,
                QCResults.View, QCResults.Create, QCResults.Validate,
                Reports.View,  Reports.Export
            ],
            ["Analyst"] =
            [
                Instruments.View,
                QCSamples.View,
                QCResults.View, QCResults.Create, QCResults.Validate,
                Reports.View
            ],
            ["Doctor"] =
            [
                Instruments.View,
                QCSamples.View,
                QCResults.View, QCResults.Authorise,
                Reports.View,  Reports.Export
            ]
        };
}
