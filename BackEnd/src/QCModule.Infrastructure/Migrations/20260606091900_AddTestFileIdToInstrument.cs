using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTestFileIdToInstrument : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Manufacturer",
                table: "Instruments");

            migrationBuilder.DropColumn(
                name: "Model",
                table: "Instruments");

            migrationBuilder.DropColumn(
                name: "SerialNumber",
                table: "Instruments");

            migrationBuilder.AddColumn<Guid>(
                name: "TestFileId",
                table: "Instruments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Instruments_TestFileId",
                table: "Instruments",
                column: "TestFileId");

            migrationBuilder.AddForeignKey(
                name: "FK_Instruments_TestFiles_TestFileId",
                table: "Instruments",
                column: "TestFileId",
                principalTable: "TestFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Instruments_TestFiles_TestFileId",
                table: "Instruments");

            migrationBuilder.DropIndex(
                name: "IX_Instruments_TestFileId",
                table: "Instruments");

            migrationBuilder.DropColumn(
                name: "TestFileId",
                table: "Instruments");

            migrationBuilder.AddColumn<string>(
                name: "Manufacturer",
                table: "Instruments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "Instruments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SerialNumber",
                table: "Instruments",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
