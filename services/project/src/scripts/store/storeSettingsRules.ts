import type { UserError } from "@shopana/shared-kernel";
import type {
  CurrencyCode,
  LocaleCode,
} from "../../repositories/models/index.js";

export interface StoreSettingsInput {
  locales: readonly LocaleCode[];
  currencies: readonly CurrencyCode[];
  defaultLocale: LocaleCode;
  defaultCurrency: CurrencyCode;
  baseCurrency?: CurrencyCode;
}

export function validateStoreSettings(
  input: StoreSettingsInput,
): UserError[] {
  const errors: UserError[] = [];

  validateActiveCodes(input.locales, "locales", "locale", errors);
  validateActiveCodes(input.currencies, "currencies", "currency", errors);

  if (
    input.locales.length > 0 &&
    !input.locales.includes(input.defaultLocale)
  ) {
    errors.push({
      code: "DEFAULT_LOCALE_NOT_ACTIVE",
      message: "Default locale must be included in active store locales",
      field: ["locales"],
    });
  }

  if (
    input.currencies.length > 0 &&
    !input.currencies.includes(input.defaultCurrency)
  ) {
    errors.push({
      code: "DEFAULT_CURRENCY_NOT_ACTIVE",
      message: "Default currency must be included in active store currencies",
      field: ["currencies"],
    });
  }

  if (
    input.baseCurrency !== undefined &&
    input.currencies.length > 0 &&
    !input.currencies.includes(input.baseCurrency)
  ) {
    errors.push({
      code: "BASE_CURRENCY_NOT_ACTIVE",
      message: "Base currency must be included in active store currencies",
      field: ["currencies"],
    });
  }

  return errors;
}

function validateActiveCodes(
  values: readonly string[],
  field: "locales" | "currencies",
  label: "locale" | "currency",
  errors: UserError[],
): void {
  if (values.length === 0) {
    errors.push({
      code: "ACTIVE_STORE_SETTING_REQUIRED",
      message: `At least one active ${label} is required`,
      field: [field],
    });
    return;
  }

  if (new Set(values).size !== values.length) {
    errors.push({
      code: "DUPLICATE_VALUE",
      message: `Active store ${field} must be unique`,
      field: [field],
    });
  }
}
