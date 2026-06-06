using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFileWatcherAndNullableUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "QCResults",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.InsertData(
                table: "AppSettings",
                columns: new[] { "Id", "CreatedAt", "IsDeleted", "Key", "UpdatedAt", "Value" },
                values: new object[,]
                {
                    { new Guid("c1000001-0000-0000-0000-000000000001"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, "file_watcher_enabled", null, "false" },
                    { new Guid("c1000001-0000-0000-0000-000000000002"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, "file_watcher_folder_path", null, "" },
                    { new Guid("c1000001-0000-0000-0000-000000000003"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, "file_watcher_archive_path", null, "" },
                    { new Guid("c1000001-0000-0000-0000-000000000004"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, "file_watcher_interval_seconds", null, "30" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AppSettings",
                keyColumn: "Id",
                keyValue: new Guid("c1000001-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "AppSettings",
                keyColumn: "Id",
                keyValue: new Guid("c1000001-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "AppSettings",
                keyColumn: "Id",
                keyValue: new Guid("c1000001-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "AppSettings",
                keyColumn: "Id",
                keyValue: new Guid("c1000001-0000-0000-0000-000000000004"));

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "QCResults",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
