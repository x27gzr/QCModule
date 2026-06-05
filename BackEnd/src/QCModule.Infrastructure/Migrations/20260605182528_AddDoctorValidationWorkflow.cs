using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorValidationWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QCResults_Users_UserId",
                table: "QCResults");

            migrationBuilder.AddColumn<int>(
                name: "AuthorisationStatus",
                table: "QCResults",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "AuthorisedAt",
                table: "QCResults",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AuthorisedBy",
                table: "QCResults",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ValidatedAt",
                table: "QCResults",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ValidatedBy",
                table: "QCResults",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ValidationStatus",
                table: "QCResults",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "CreatedAt", "Description", "IsDeleted", "IsSystem", "Name", "UpdatedAt" },
                values: new object[] { new Guid("c4c8e2a9-1d6b-4f3e-9a7c-2b5d8e0f1a3c"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Authorises validated QC results (second approval layer).", false, true, "Doctor", null });

            migrationBuilder.CreateIndex(
                name: "IX_QCResults_AuthorisedBy",
                table: "QCResults",
                column: "AuthorisedBy");

            migrationBuilder.CreateIndex(
                name: "IX_QCResults_ValidatedBy",
                table: "QCResults",
                column: "ValidatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_QCResults_Users_AuthorisedBy",
                table: "QCResults",
                column: "AuthorisedBy",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_QCResults_Users_UserId",
                table: "QCResults",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_QCResults_Users_ValidatedBy",
                table: "QCResults",
                column: "ValidatedBy",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QCResults_Users_AuthorisedBy",
                table: "QCResults");

            migrationBuilder.DropForeignKey(
                name: "FK_QCResults_Users_UserId",
                table: "QCResults");

            migrationBuilder.DropForeignKey(
                name: "FK_QCResults_Users_ValidatedBy",
                table: "QCResults");

            migrationBuilder.DropIndex(
                name: "IX_QCResults_AuthorisedBy",
                table: "QCResults");

            migrationBuilder.DropIndex(
                name: "IX_QCResults_ValidatedBy",
                table: "QCResults");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: new Guid("c4c8e2a9-1d6b-4f3e-9a7c-2b5d8e0f1a3c"));

            migrationBuilder.DropColumn(
                name: "AuthorisationStatus",
                table: "QCResults");

            migrationBuilder.DropColumn(
                name: "AuthorisedAt",
                table: "QCResults");

            migrationBuilder.DropColumn(
                name: "AuthorisedBy",
                table: "QCResults");

            migrationBuilder.DropColumn(
                name: "ValidatedAt",
                table: "QCResults");

            migrationBuilder.DropColumn(
                name: "ValidatedBy",
                table: "QCResults");

            migrationBuilder.DropColumn(
                name: "ValidationStatus",
                table: "QCResults");

            migrationBuilder.AddForeignKey(
                name: "FK_QCResults_Users_UserId",
                table: "QCResults",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
