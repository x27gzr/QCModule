using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QCModule.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQCResultDeletedReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeletedReason",
                table: "QCResults",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedReason",
                table: "QCResults");
        }
    }
}
