using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jardo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGardenMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MapLayout",
                table: "Gardens",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GardenMapSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    GardenId = table.Column<int>(type: "INTEGER", nullable: false),
                    SlotKey = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SpaceId = table.Column<int>(type: "INTEGER", nullable: false),
                    ZoneId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GardenMapSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GardenMapSlots_Gardens_GardenId",
                        column: x => x.GardenId,
                        principalTable: "Gardens",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GardenMapSlots_Spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "Spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GardenMapSlots_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Gardens",
                keyColumn: "Id",
                keyValue: 1,
                column: "MapLayout",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_GardenMapSlots_GardenId_SlotKey",
                table: "GardenMapSlots",
                columns: new[] { "GardenId", "SlotKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GardenMapSlots_SpaceId",
                table: "GardenMapSlots",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_GardenMapSlots_ZoneId",
                table: "GardenMapSlots",
                column: "ZoneId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GardenMapSlots");

            migrationBuilder.DropColumn(
                name: "MapLayout",
                table: "Gardens");
        }
    }
}
