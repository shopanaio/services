import { sql, type SQL } from "drizzle-orm";
import { compileFacetResolutionSql } from "./compileFacetResolutionSql.js";
import {
  compileListingInputSql,
  type ListingSqlRequest,
} from "./compileListingInputSql.js";
import { compileScopeSql } from "./compileScopeSql.js";
import { compileFiltersSql } from "./compileFiltersSql.js";

export function compileCoreListingSql(request: ListingSqlRequest): SQL {
  return sql.join(
    [
      compileListingInputSql(request),
      compileFacetResolutionSql(),
      compileScopeSql(request),
      compileFiltersSql(),
      compileMatchesSql(),
    ],
    sql`, `
  );
}

export function compileMatchesSql(): SQL {
  return sql`
    matches AS (
      SELECT
        CASE
          WHEN pf.bitmap IS NOT NULL AND pvp.bitmap IS NOT NULL
          THEN sp.bitmap & pp.bitmap & pf.bitmap & pvp.bitmap
          WHEN pf.bitmap IS NOT NULL
          THEN sp.bitmap & pp.bitmap & pf.bitmap
          WHEN pvp.bitmap IS NOT NULL
          THEN sp.bitmap & pp.bitmap & pvp.bitmap
          ELSE sp.bitmap & pp.bitmap
        END AS bitmap
      FROM scope_products sp
      CROSS JOIN published_products pp
      CROSS JOIN product_filters pf
      CROSS JOIN projected_variant_products pvp
    )
  `;
}
