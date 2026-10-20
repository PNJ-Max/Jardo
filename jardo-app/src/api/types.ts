// Noms courts des contrats de l'API. Les types eux-mêmes sont générés depuis son Swagger
// (`npm run api:types`, API démarrée) dans ./generated : ne jamais les modifier à la main.
//
// Les DateOnly arrivent en chaîne "YYYY-MM-DD", les DateTimeOffset en ISO complet.

export type {
  CompleteTaskDto as CompleteTaskInput,
  DryingStatus,
  DueHorizon,
  DueStatus,
  GardenResponseDto as Garden,
  JournalEntryKind,
  JournalEntryResponseDto as JournalEntry,
  MeasureUnit,
  PlantResponseDto as Plant,
  QuantityUnit,
  SaveJournalEntryDto as JournalEntryInput,
  SavePlantDto as PlantInput,
  SaveSpaceDto as SpaceInput,
  SaveTaskDto as TaskInput,
  SaveWoodPileDto as WoodPileInput,
  SaveZoneDto as ZoneInput,
  SpaceKind,
  SpaceResponseDto as Space,
  TaskRecurrence,
  TaskResponseDto as GardenTask,
  ValidationProblemDetails as ProblemDetails,
  WoodPileResponseDto as WoodPile,
  ZoneResponseDto as Zone,
} from './generated';
