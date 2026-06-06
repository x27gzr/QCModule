using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefactorTestFileTypeAndParameterFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "TestFiles");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "TestFiles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Numerical");

            migrationBuilder.AddColumn<string>(
                name: "OutputMask",
                table: "TestFileParameters",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Sequence",
                table: "TestFileParameters",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TestCode",
                table: "TestFileParameters",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "TestFiles");

            migrationBuilder.DropColumn(
                name: "OutputMask",
                table: "TestFileParameters");

            migrationBuilder.DropColumn(
                name: "Sequence",
                table: "TestFileParameters");

            migrationBuilder.DropColumn(
                name: "TestCode",
                table: "TestFileParameters");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "TestFiles",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
