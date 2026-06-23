export type NormalizedCategoryHierarchyScope =
  | { kind: "empty" }
  | {
      kind: "scope";
      referenceId: string;
      direction: "ANCESTORS" | "DESCENDANTS";
      includeReference: boolean;
      mode: "INCLUDE" | "EXCLUDE";
    };
