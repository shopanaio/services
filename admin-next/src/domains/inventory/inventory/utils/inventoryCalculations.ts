export interface InventoryValues {
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
}

export interface ValidationError {
  field: keyof InventoryValues;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface CalculationResult {
  values: InventoryValues;
  changes: {
    onHand: number;
    unavailable: number;
    reserved: number;
    available: number;
  };
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates inventory values according to business rules
 */
export function validateInventory(values: InventoryValues): ValidationResult {
  const errors: ValidationError[] = [];

  // Rule 1: Values cannot be negative
  if (values.onHand < 0) {
    errors.push({
      field: "onHand",
      message: "On hand quantity cannot be negative",
    });
  }

  if (values.unavailable < 0) {
    errors.push({
      field: "unavailable",
      message: "Unavailable quantity cannot be negative",
    });
  }

  if (values.reserved < 0) {
    errors.push({
      field: "reserved",
      message: "Reserved quantity cannot be negative",
    });
  }

  // Rule 2: Component values cannot exceed On Hand
  if (values.unavailable > values.onHand) {
    errors.push({
      field: "unavailable",
      message: "Unavailable cannot exceed on hand quantity",
    });
  }

  // Rule 3: Available cannot be negative
  if (values.available < 0) {
    errors.push({
      field: "available",
      message: "This change would result in negative availability",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates inventory values with validation
 * Formula: Available = On Hand - Unavailable - Reserved
 */
export function calculateInventory(
  values: Partial<InventoryValues>,
  base: InventoryValues
): CalculationResult {
  const onHand = values.onHand ?? base.onHand;
  const unavailable = values.unavailable ?? base.unavailable;
  const reserved = values.reserved ?? base.reserved;

  const available = onHand - unavailable - reserved;

  const calculatedValues: InventoryValues = {
    onHand,
    unavailable,
    reserved,
    available,
  };

  const validation = validateInventory(calculatedValues);

  return {
    values: calculatedValues,
    changes: {
      onHand: onHand - base.onHand,
      unavailable: unavailable - base.unavailable,
      reserved: reserved - base.reserved,
      available: available - base.available,
    },
    isValid: validation.isValid,
    errors: validation.errors,
  };
}

/**
 * Validates a single field change
 */
export function validateFieldChange(
  field: "onHand" | "unavailable",
  newValue: number,
  base: InventoryValues
): ValidationResult {
  const testValues: Partial<InventoryValues> = { [field]: newValue };
  const result = calculateInventory(testValues, base);
  return {
    isValid: result.isValid,
    errors: result.errors,
  };
}
