using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jardo.Api.Migrations
{
    /// <inheritdoc />
    public partial class GardenTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WateringIntervalDays",
                table: "GardenItems");

            migrationBuilder.CreateTable(
                name: "GardenTasks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SpaceId = table.Column<int>(type: "INTEGER", nullable: false),
                    ZoneId = table.Column<int>(type: "INTEGER", nullable: true),
                    ItemId = table.Column<int>(type: "INTEGER", nullable: true),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Recurrence = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    IntervalDays = table.Column<int>(type: "INTEGER", nullable: true),
                    StartDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GardenTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GardenTasks_GardenItems_ItemId",
                        column: x => x.ItemId,
                        principalTable: "GardenItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GardenTasks_Spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "Spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GardenTasks_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GardenTasks_ItemId",
                table: "GardenTasks",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_GardenTasks_SpaceId",
                table: "GardenTasks",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_GardenTasks_ZoneId",
                table: "GardenTasks",
                column: "ZoneId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GardenTasks");

            migrationBuilder.AddColumn<int>(
                name: "WateringIntervalDays",
                table: "GardenItems",
                type: "INTEGER",
                nullable: true);
        }
    }
}
