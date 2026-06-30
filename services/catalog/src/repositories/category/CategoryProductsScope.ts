export type NormalizedCategoryProductsScope =
  | { kind: "empty" }
  | {
      kind: "scope";
      referenceIds: string[];
      mode: "INCLUDE" | "EXCLUDE";
    };
