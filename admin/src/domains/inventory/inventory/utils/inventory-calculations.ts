// Re-export from shared module for backwards compatibility
export {
  type InventoryValues,
  type ValidationError,
  type ValidationResult,
  type CalculationResult,
  calculateAvailable,
  validateInventory,
  calculateInventory,
  validateFieldChange,
} from "@/shared/utils/inventory";
