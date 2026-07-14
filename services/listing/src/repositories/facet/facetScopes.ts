import { sql, type SQL } from "drizzle-orm";

type FacetListingScope =
  | { kind: "category"; categoryId: string }
  | { kind: "global" };

export type FacetScopeType = "SEARCH" | "CATEGORY";

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
