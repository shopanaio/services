export type NormalizedProductCategoriesScope =
  | { kind: "empty" }
  | {
      kind: "scope";
      referenceIds: string[];
      mode: "INCLUDE" | "EXCLUDE";
    };
