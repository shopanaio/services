import { sql, type SQL } from "drizzle-orm";
import {
  buildAvailabilityVariantTerm,
  encodeListingVariantTerm,
} from "../../../listing/variantTerms/index.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileProductBaseBitmapSql,
  compileProjectedVariantProductsBitmapSql,
  compileScopeProductCtes,
  compileVariantCandidatesBitmapSql,
  compileVariantTermPostingBitmapSql,
} from "./compileListingProductMatchesSql.js";

export function compileVirtualFacetsQuerySql(request: ListingSqlRequest): SQL {
  const productBase = compileProductBaseBitmapSql(request);
  const termsWithoutPrice = compileVariantCandidatesBitmapSql(request, {
    excludePrice: true,
  });
  const availabilityBase = compileVariantCandidatesBitmapSql(request, {
    excludeGroupKey: "criterion.availability",
  });
  const availablePosting = compileVariantTermPostingBitmapSql(
    request,
    encodeListingVariantTerm(buildAvailabilityVariantTerm(true))
  );
  const availableProducts = compileProjectedVariantProductsBitmapSql(
    request,
    sql`(${availabilityBase} & ${availablePosting})`
  );
  const unavailablePosting = compileVariantTermPostingBitmapSql(
    request,
    encodeListingVariantTerm(buildAvailabilityVariantTerm(false))
  );
  const unavailableProducts = compileProjectedVariantProductsBitmapSql(
    request,
    sql`(${availabilityBase} & ${unavailablePosting})`
  );

  return sql`
    /* listing:virtualFacets */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    product_base AS (
      SELECT ${productBase} AS bitmap
    ),
    matching_term_variants AS (
      SELECT ${termsWithoutPrice} AS bitmap
    ),
    price_range_bounds AS (
      SELECT
        MIN(vp.price_minor)::bigint AS min_price_minor,
        MAX(vp.price_minor)::bigint AS max_price_minor
      FROM input i
      JOIN listing.variant_listing_price_index vp
        ON vp.store_id = i.store_id
       AND vp.currency = i.currency
       AND vp.has_price = true
       AND vp.price_minor IS NOT NULL
      CROSS JOIN product_base pb
      CROSS JOIN matching_term_variants mtv
      WHERE mtv.bitmap @> vp.variant_doc_id
        AND pb.bitmap @> vp.product_doc_id
    )
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      CASE
        WHEN bounds.min_price_minor IS NULL OR bounds.max_price_minor IS NULL
        THEN NULL
        ELSE jsonb_build_object(
          'minPriceMinor', bounds.min_price_minor,
          'maxPriceMinor', bounds.max_price_minor,
          'currency', ${request.currency}::text
        )
      END AS "priceRange",
      rb_cardinality(${productBase} & ${availableProducts})::int AS "inStockCount",
      rb_cardinality(${productBase} & ${unavailableProducts})::int AS "unavailableCount"
    FROM price_range_bounds bounds
  `;
}
