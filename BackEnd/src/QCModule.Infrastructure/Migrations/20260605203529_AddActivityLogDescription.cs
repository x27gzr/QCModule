using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityLogDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ActivityLogs",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "ActivityLogs");
        }
    }
}
