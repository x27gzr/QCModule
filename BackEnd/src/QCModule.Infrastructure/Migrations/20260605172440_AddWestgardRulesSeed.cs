using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWestgardRulesSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "WestgardRules",
                columns: new[] { "Id", "CreatedAt", "Description", "IsDeleted", "IsEnabled", "IsRejection", "IsWarning", "RuleCode", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("a1000001-0000-0000-0000-000000000001"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Warning: one value exceeds ±2SD. Investigate but do not reject.", false, true, false, true, "1:2s", null },
                    { new Guid("a1000001-0000-0000-0000-000000000002"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rejection: one value exceeds ±3SD. Random error.", false, true, true, false, "1:3s", null },
                    { new Guid("a1000001-0000-0000-0000-000000000003"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rejection: two consecutive values exceed the same ±2SD limit.", false, true, true, false, "2:2s", null },
                    { new Guid("a1000001-0000-0000-0000-000000000004"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rejection: range between two values in a run exceeds 4SD.", false, true, true, false, "R:4s", null },
                    { new Guid("a1000001-0000-0000-0000-000000000005"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rejection: four consecutive values exceed the same ±1SD limit.", false, true, true, false, "4:1s", null },
                    { new Guid("a1000001-0000-0000-0000-000000000006"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Rejection: ten consecutive values fall on the same side of mean.", false, true, true, false, "10:x", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "WestgardRules",
                keyColumn: "Id",
                keyValue: new Guid("a1000001-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "WestgardRules",
                keyColumn: "Id",
                keyValue: new Guid("a1000001-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "WestgardRules",
                keyColumn: "Id",
                keyValue: new Guid("a1000001-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "WestgardRules",
                keyColumn: "Id",
                keyValue: new Guid("a1000001-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "WestgardRules",
                keyColumn: "Id",
                keyValue: new Guid("a1000001-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "WestgardRules",
                keyColumn: "Id",
                keyValue: new Guid("a1000001-0000-0000-0000-000000000006"));
        }
    }
}
