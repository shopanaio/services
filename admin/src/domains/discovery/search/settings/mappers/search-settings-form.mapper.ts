import type {
  ApiSearchSettings,
  ApiSearchSettingsOperationsInput,
} from "@/graphql/types";
import { SearchField, SearchOutOfStockPolicy } from "@/graphql/types";
import type { SearchSettingsFormValues } from "../page/types";

export interface SearchFieldDefinition {
  field: SearchField;
  label: string;
  help: string;
  defaultWeight: number;
}

export const SEARCH_FIELD_DEFINITIONS: SearchFieldDefinition[] = [
  {
    field: SearchField.ProductTitle,
    label: "Product title",
    help: "Main product name shown in the storefront.",
    defaultWeight: 8,
  },
  {
    field: SearchField.VariantTitle,
    label: "Variant title",
    help: "Variant-specific title and identifying text.",
    defaultWeight: 5,
  },
  {
    field: SearchField.VendorName,
    label: "Vendor name",
    help: "Brand or supplier name.",
    defaultWeight: 2,
  },
  {
    field: SearchField.CategoryName,
    label: "Category name",
    help: "Category assigned to the product.",
    defaultWeight: 1,
  },
];

export const INITIAL_SEARCH_SETTINGS_FORM_VALUES: SearchSettingsFormValues = {
  fields: SEARCH_FIELD_DEFINITIONS.map(({ field, defaultWeight }) => ({
    field,
    enabled: true,
    weight: defaultWeight,
  })),
  typoToleranceEnabled: false,
  outOfStockPolicy: SearchOutOfStockPolicy.Show,
};

export function mapSearchSettingsToFormValues(
  settings: ApiSearchSettings,
): SearchSettingsFormValues {
  const configuredFields = new Map(
    settings.fields.map((item) => [item.field, item.weight]),
  );

  return {
    fields: SEARCH_FIELD_DEFINITIONS.map(({ field, defaultWeight }) => ({
      field,
      enabled:
        field === SearchField.ProductTitle || configuredFields.has(field),
      weight: configuredFields.get(field) ?? defaultWeight,
    })),
    typoToleranceEnabled: settings.typoToleranceEnabled,
    outOfStockPolicy: settings.outOfStockPolicy,
  };
}

export interface SearchSettingsSubmitMapping {
  operations: ApiSearchSettingsOperationsInput;
  submittedIndexToField: SearchField[];
}

export function mapSearchSettingsFormToOperations(
  values: SearchSettingsFormValues,
): SearchSettingsSubmitMapping {
  const enabledFields = values.fields.filter(
    (item) => item.field === SearchField.ProductTitle || item.enabled,
  );

  return {
    operations: {
      settings: {
        fields: enabledFields.map(({ field, weight }) => ({ field, weight })),
        typoToleranceEnabled: values.typoToleranceEnabled,
        outOfStockPolicy: values.outOfStockPolicy,
      },
    },
    submittedIndexToField: enabledFields.map(({ field }) => field),
  };
}

export function normalizeSearchField(field: SearchField): string {
  return field.toLowerCase().replaceAll("_", "-");
}
