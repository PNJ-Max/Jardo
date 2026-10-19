using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jardo.Api.Migrations
{
    /// <inheritdoc />
    public partial class GardenAndSpaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Aucune donnée réelle n'existe, donc pas de reprise : une ancienne base de développement
            // est vidée plutôt que de garder des zones sans espace et des plantes sans type.
            migrationBuilder.Sql("DELETE FROM Observations;");
            migrationBuilder.Sql("DELETE FROM WateringLogs;");
            migrationBuilder.Sql("DELETE FROM Plants;");
            migrationBuilder.Sql("DELETE FROM Zones;");

            migrationBuilder.DropForeignKey(
                name: "FK_Observations_Plants_PlantId",
                table: "Observations");

            migrationBuilder.DropForeignKey(
                name: "FK_Plants_Zones_ZoneId",
                table: "Plants");

            migrationBuilder.DropForeignKey(
                name: "FK_WateringLogs_Plants_PlantId",
                table: "WateringLogs");

            migrationBuilder.DropIndex(
                name: "IX_Zones_Name",
                table: "Zones");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Plants",
                table: "Plants");

            migrationBuilder.DropIndex(
                name: "IX_Plants_ZoneId_IsArchived",
                table: "Plants");

            migrationBuilder.RenameTable(
                name: "Plants",
                newName: "GardenItems");

            migrationBuilder.AddColumn<int>(
                name: "SpaceId",
                table: "Zones",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "ZoneId",
                table: "GardenItems",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "WateringIntervalDays",
                table: "GardenItems",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<string>(
                name: "ItemType",
                table: "GardenItems",
                type: "TEXT",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "Quantity",
                table: "GardenItems",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuantityUnit",
                table: "GardenItems",
                type: "TEXT",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "SownDate",
                table: "GardenItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SpaceId",
                table: "GardenItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Variety",
                table: "GardenItems",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_GardenItems",
                table: "GardenItems",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "Gardens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Gardens", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Spaces",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    GardenId = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    IsArchived = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Spaces", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Spaces_Gardens_GardenId",
                        column: x => x.GardenId,
                        principalTable: "Gardens",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Gardens",
                columns: new[] { "Id", "CreatedAt", "Name" },
                values: new object[] { 1, new DateTimeOffset(new DateTime(2026, 10, 18, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Mon jardin" });

            migrationBuilder.CreateIndex(
                name: "IX_Zones_SpaceId_Name",
                table: "Zones",
                columns: new[] { "SpaceId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GardenItems_SpaceId_IsArchived",
                table: "GardenItems",
                columns: new[] { "SpaceId", "IsArchived" });

            migrationBuilder.CreateIndex(
                name: "IX_GardenItems_ZoneId",
                table: "GardenItems",
                column: "ZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Spaces_GardenId_Name",
                table: "Spaces",
                columns: new[] { "GardenId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_GardenItems_Spaces_SpaceId",
                table: "GardenItems",
                column: "SpaceId",
                principalTable: "Spaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GardenItems_Zones_ZoneId",
                table: "GardenItems",
                column: "ZoneId",
                principalTable: "Zones",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Observations_GardenItems_PlantId",
                table: "Observations",
                column: "PlantId",
                principalTable: "GardenItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WateringLogs_GardenItems_PlantId",
                table: "WateringLogs",
                column: "PlantId",
                principalTable: "GardenItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Zones_Spaces_SpaceId",
                table: "Zones",
                column: "SpaceId",
                principalTable: "Spaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GardenItems_Spaces_SpaceId",
                table: "GardenItems");

            migrationBuilder.DropForeignKey(
                name: "FK_GardenItems_Zones_ZoneId",
                table: "GardenItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Observations_GardenItems_PlantId",
                table: "Observations");

            migrationBuilder.DropForeignKey(
                name: "FK_WateringLogs_GardenItems_PlantId",
                table: "WateringLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_Zones_Spaces_SpaceId",
                table: "Zones");

            migrationBuilder.DropTable(
                name: "Spaces");

            migrationBuilder.DropTable(
                name: "Gardens");

            migrationBuilder.DropIndex(
                name: "IX_Zones_SpaceId_Name",
                table: "Zones");

            migrationBuilder.DropPrimaryKey(
                name: "PK_GardenItems",
                table: "GardenItems");

            migrationBuilder.DropIndex(
                name: "IX_GardenItems_SpaceId_IsArchived",
                table: "GardenItems");

            migrationBuilder.DropIndex(
                name: "IX_GardenItems_ZoneId",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "SpaceId",
                table: "Zones");

            migrationBuilder.DropColumn(
                name: "ItemType",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "QuantityUnit",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "SownDate",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "SpaceId",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "Variety",
                table: "GardenItems");

            migrationBuilder.RenameTable(
                name: "GardenItems",
                newName: "Plants");

            migrationBuilder.AlterColumn<int>(
                name: "ZoneId",
                table: "Plants",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "WateringIntervalDays",
                table: "Plants",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Plants",
                table: "Plants",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Zones_Name",
                table: "Zones",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Plants_ZoneId_IsArchived",
                table: "Plants",
                columns: new[] { "ZoneId", "IsArchived" });

            migrationBuilder.AddForeignKey(
                name: "FK_Observations_Plants_PlantId",
                table: "Observations",
                column: "PlantId",
                principalTable: "Plants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Plants_Zones_ZoneId",
                table: "Plants",
                column: "ZoneId",
                principalTable: "Zones",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WateringLogs_Plants_PlantId",
                table: "WateringLogs",
                column: "PlantId",
                principalTable: "Plants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
