import type { SearchTextField } from "../../repositories/search/searchRepositoryTypes.js";
import { indexUnavailable } from "../errors.js";

export interface SearchFieldDefinition {
  readonly field: SearchTextField;
  readonly defaultWeight: number;
  readonly source: "product" | "variant" | "vendor" | "category";
}

const DEFINITIONS: readonly SearchFieldDefinition[] = Object.freeze([
  Object.freeze({
    field: "product_title",
    defaultWeight: 8,
    source: "product",
  }),
  Object.freeze({
    field: "variant_title",
    defaultWeight: 5,
    source: "variant",
  }),
  Object.freeze({
    field: "vendor_name",
    defaultWeight: 2,
    source: "vendor",
  }),
  Object.freeze({
    field: "category_name",
    defaultWeight: 1,
    source: "category",
  }),
]);

export class SearchFieldRegistry {
  private readonly definitions = new Map(
    DEFINITIONS.map((definition) => [definition.field, definition]),
  );

  get(field: SearchTextField): SearchFieldDefinition {
    const definition = this.definitions.get(field);
    if (!definition) {
      throw indexUnavailable(`Unknown search field: ${field}`);
    }
    return definition;
  }

  normalizeEnabledFields(fields: readonly SearchTextField[]): readonly SearchTextField[] {
    if (fields.length === 0) {
      throw indexUnavailable("At least one search field must be enabled");
    }
    const unique = new Set(fields);
    for (const field of unique) this.get(field);
    return Object.freeze(
      DEFINITIONS.map((definition) => definition.field).filter((field) => unique.has(field)),
    );
  }

  defaultWeights(): Readonly<Record<SearchTextField, number>> {
    return Object.freeze(
      Object.fromEntries(
        DEFINITIONS.map((definition) => [definition.field, definition.defaultWeight]),
      ) as Record<SearchTextField, number>,
    );
  }

  list(): readonly SearchFieldDefinition[] {
    return DEFINITIONS;
  }
}
