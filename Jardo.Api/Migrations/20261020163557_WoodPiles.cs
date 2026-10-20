using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jardo.Api.Migrations
{
    /// <inheritdoc />
    public partial class WoodPiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "CutDate",
                table: "GardenItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DryingMonths",
                table: "GardenItems",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "InitialSteres",
                table: "GardenItems",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LogLengthCm",
                table: "GardenItems",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WoodSpecies",
                table: "GardenItems",
                type: "TEXT",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CutDate",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "DryingMonths",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "InitialSteres",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "LogLengthCm",
                table: "GardenItems");

            migrationBuilder.DropColumn(
                name: "WoodSpecies",
                table: "GardenItems");
        }
    }
}
