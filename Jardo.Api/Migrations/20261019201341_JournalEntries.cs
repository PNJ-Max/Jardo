using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jardo.Api.Migrations
{
    /// <inheritdoc />
    public partial class JournalEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Observations");

            migrationBuilder.DropTable(
                name: "WateringLogs");

            migrationBuilder.CreateTable(
                name: "JournalEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SpaceId = table.Column<int>(type: "INTEGER", nullable: false),
                    ZoneId = table.Column<int>(type: "INTEGER", nullable: true),
                    ItemId = table.Column<int>(type: "INTEGER", nullable: true),
                    Date = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Note = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Quantity = table.Column<double>(type: "REAL", nullable: true),
                    QuantityUnit = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    HeightCm = table.Column<int>(type: "INTEGER", nullable: true),
                    Problem = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Treatment = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalEntries_GardenItems_ItemId",
                        column: x => x.ItemId,
                        principalTable: "GardenItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JournalEntries_Spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "Spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JournalEntries_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_ItemId",
                table: "JournalEntries",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_SpaceId_Date",
                table: "JournalEntries",
                columns: new[] { "SpaceId", "Date" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_JournalEntries_ZoneId",
                table: "JournalEntries",
                column: "ZoneId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JournalEntries");

            migrationBuilder.CreateTable(
                name: "Observations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PlantId = table.Column<int>(type: "INTEGER", nullable: false),
                    HeightCm = table.Column<int>(type: "INTEGER", nullable: true),
                    Note = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    ObservedAt = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ProblemNote = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Treatment = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Observations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Observations_GardenItems_PlantId",
                        column: x => x.PlantId,
                        principalTable: "GardenItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WateringLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PlantId = table.Column<int>(type: "INTEGER", nullable: false),
                    Note = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    WateredAt = table.Column<DateOnly>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WateringLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WateringLogs_GardenItems_PlantId",
                        column: x => x.PlantId,
                        principalTable: "GardenItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Observations_PlantId_ObservedAt",
                table: "Observations",
                columns: new[] { "PlantId", "ObservedAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_WateringLogs_PlantId_WateredAt",
                table: "WateringLogs",
                columns: new[] { "PlantId", "WateredAt" },
                descending: new[] { false, true });
        }
    }
}
