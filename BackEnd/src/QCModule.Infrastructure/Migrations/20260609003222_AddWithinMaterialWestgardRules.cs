using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWithinMaterialWestgardRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NxCount",
                table: "QCSamples",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<double>(
                name: "RejectSD",
                table: "QCSamples",
                type: "float",
                nullable: false,
                defaultValue: 3.0);

            migrationBuilder.AddColumn<bool>(
                name: "Rule2_2sDiff",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule7T",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NxCount",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "RejectSD",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule2_2sDiff",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule7T",
                table: "QCSamples");
        }
    }
}
