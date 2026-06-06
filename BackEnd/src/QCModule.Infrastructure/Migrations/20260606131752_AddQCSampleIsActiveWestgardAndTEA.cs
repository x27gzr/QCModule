using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQCSampleIsActiveWestgardAndTEA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Tea",
                table: "QCSampleTargets",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TeaUnit",
                table: "QCSampleTargets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule10x",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule1_2s",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule1_3s",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule2_2s",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule3_1s",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule4_1s",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Rule9x",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RuleR_4s",
                table: "QCSamples",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Tea",
                table: "QCSampleTargets");

            migrationBuilder.DropColumn(
                name: "TeaUnit",
                table: "QCSampleTargets");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule10x",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule1_2s",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule1_3s",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule2_2s",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule3_1s",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule4_1s",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "Rule9x",
                table: "QCSamples");

            migrationBuilder.DropColumn(
                name: "RuleR_4s",
                table: "QCSamples");
        }
    }
}
