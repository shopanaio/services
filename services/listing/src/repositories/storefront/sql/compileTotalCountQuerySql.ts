import { sql, type SQL } from "drizzle-orm";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileProductMatchesBitmapSql,
  compileScopeProductCtes,
  hasVariantPredicate,
  shouldApplyProductStockAtProductLevel,
} from "./compileListingProductMatchesSql.js";

export function compileTotalCountQuerySql(request: ListingSqlRequest): SQL {
  return sql`
    /* listing:totalCount */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    product_matches AS (
      SELECT ${compileProductMatchesBitmapSql(request, {
        includeProductStock: shouldApplyProductStockAtProductLevel(request),
        includeVariantProjection: hasVariantPredicate(request),
      })} AS bitmap
    )
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      rb_cardinality((SELECT bitmap FROM product_matches))::int AS "totalCount"
  `;
}
