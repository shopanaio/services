import { sql, type SQL } from "drizzle-orm";

type FacetListingScope =
  | { kind: "category"; categoryId: string }
  | { kind: "global" };

export const FACET_SCOPE_TYPES = ["SEARCH", "CATEGORY"] as const;

export type FacetScopeType = (typeof FACET_SCOPE_TYPES)[number];

export function isFacetScopeType(value: string): value is FacetScopeType {
  return (FACET_SCOPE_TYPES as readonly string[]).includes(value);
}

export function compileEligibleFacetIdsSql(input: {
  storeIdSql: SQL;
  scope: FacetListingScope;
}): SQL {
  const scopeType: FacetScopeType = input.scope.kind === "category"
    ? "CATEGORY"
    : "SEARCH";

  return sql`
    SELECT DISTINCT fs.facet_id
    FROM listing.facet_scope fs
    WHERE fs.store_id = ${input.storeIdSql}
      AND fs.scope_type = ${scopeType}
  `;
}
