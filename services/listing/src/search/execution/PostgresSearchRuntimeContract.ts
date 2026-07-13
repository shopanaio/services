import { sql, type SQL } from "drizzle-orm";
import { indexUnavailable } from "../errors.js";
import { POSTGRES_FTS_COMPILER_VERSION } from "./PostgresFtsQueryCompiler.js";
import { POSTGRES_TYPO_SIMILARITY_THRESHOLD_MAX } from "./PostgresTypoQueryCompiler.js";

export interface PostgresSearchRuntimeObservation {
  readonly simpleConfigurationAvailable: boolean;
  readonly btreeGinAvailable: boolean;
  readonly roaringBitmapAvailable: boolean;
  readonly ginFuzzySearchLimit: number;
  readonly pgTrgmAvailable: boolean;
  readonly fuzzystrmatchAvailable: boolean;
  readonly trigramSimilarityThreshold?: number | null;
}

export interface PostgresSearchRuntimeContract {
  readonly ftsConfiguration: "pg_catalog.simple";
  readonly compilerVersion: string;
  readonly ginFuzzySearchLimit: 0;
}

export const POSTGRES_SEARCH_RUNTIME_CONTRACT:
PostgresSearchRuntimeContract = Object.freeze({
  ftsConfiguration: "pg_catalog.simple",
  compilerVersion: POSTGRES_FTS_COMPILER_VERSION,
  ginFuzzySearchLimit: 0,
});

export function compilePostgresSearchRuntimeProbeSql(): SQL {
  return sql`
    SELECT
      to_regconfig('pg_catalog.simple') IS NOT NULL
        AS "simpleConfigurationAvailable",
      EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'btree_gin'
      ) AS "btreeGinAvailable",
      EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'roaringbitmap'
      ) AS "roaringBitmapAvailable",
      current_setting('gin_fuzzy_search_limit')::int
        AS "ginFuzzySearchLimit",
      EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
      ) AS "pgTrgmAvailable",
      EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'fuzzystrmatch'
      ) AS "fuzzystrmatchAvailable"
  `;
}

export function compilePostgresTypoRuntimeProbeSql(): SQL {
  return sql`
    WITH load_pg_trgm AS MATERIALIZED (
      SELECT similarity('', '') AS ignored
    )
    SELECT
      current_setting('pg_trgm.similarity_threshold')::double precision
        AS "trigramSimilarityThreshold"
    FROM load_pg_trgm
  `;
}

export function assertPostgresSearchRuntimeCompatible(
  observed: PostgresSearchRuntimeObservation,
  options: { requireTypo?: boolean } = {},
): void {
  if (!observed.simpleConfigurationAvailable) {
    throw indexUnavailable("pg_catalog.simple is unavailable");
  }
  if (!observed.btreeGinAvailable) {
    throw indexUnavailable("btree_gin is unavailable");
  }
  if (!observed.roaringBitmapAvailable) {
    throw indexUnavailable("roaringbitmap is unavailable");
  }
  if (
    observed.ginFuzzySearchLimit !==
      POSTGRES_SEARCH_RUNTIME_CONTRACT.ginFuzzySearchLimit
  ) {
    throw indexUnavailable("gin_fuzzy_search_limit must be 0");
  }
  if (!options.requireTypo) return;
  if (!observed.pgTrgmAvailable || !observed.fuzzystrmatchAvailable) {
    throw indexUnavailable("PostgreSQL typo extensions are unavailable");
  }
  const threshold = observed.trigramSimilarityThreshold;
  if (
    threshold === null ||
    threshold === undefined ||
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    threshold > POSTGRES_TYPO_SIMILARITY_THRESHOLD_MAX
  ) {
    throw indexUnavailable(
      "pg_trgm similarity threshold does not satisfy the distance-one contract",
    );
  }
}
