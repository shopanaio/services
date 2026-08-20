import type { UserError } from "@shopana/shared-kernel";
import type { LocaleCode } from "../../repositories/models/index.js";

export interface StoreSettingsInput {
  locales: readonly LocaleCode[];
  defaultLocale: LocaleCode;
}

export function validateStoreSettings(input: StoreSettingsInput): UserError[] {
  const errors: UserError[] = [];

  validateActiveCodes(input.locales, "locales", "locale", errors);

  if (input.locales.length > 0 && !input.locales.includes(input.defaultLocale)) {
    errors.push({
      code: "DEFAULT_LOCALE_NOT_ACTIVE",
      message: "Default locale must be included in active store locales",
      field: ["locales"],
    });
  }

  return errors;
}

function validateActiveCodes(
  values: readonly string[],
  field: "locales",
  label: "locale",
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
