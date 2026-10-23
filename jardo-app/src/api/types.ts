// Noms courts des contrats de l'API. Les types eux-mêmes sont générés depuis son Swagger
// (`npm run api:types`, API démarrée) dans ./generated : ne jamais les modifier à la main.
//
// Les DateOnly arrivent en chaîne "YYYY-MM-DD", les DateTimeOffset en ISO complet.

export type {
  CompleteTaskDto as CompleteTaskInput,
  DryingStatus,
  DueHorizon,
  DueStatus,
  GardenMapResponseDto as GardenMap,
  GardenMapSlotResponseDto as GardenMapSlot,
  GardenResponseDto as Garden,
  ItemKind,
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
  TaskCompletionResponseDto as TaskCompletion,
  TaskRecurrence,
  TaskResponseDto as GardenTask,
  UpdateGardenDto as GardenInput,
  ValidationProblemDetails as ProblemDetails,
  WoodPileResponseDto as WoodPile,
  ZoneResponseDto as Zone,
} from './generated';
