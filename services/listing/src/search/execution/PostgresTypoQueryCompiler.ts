import { sql, type SQL } from "drizzle-orm";
import { indexUnavailable } from "../errors.js";

export const POSTGRES_TYPO_COMPILER_VERSION = "1";
export const POSTGRES_TYPO_SIMILARITY_THRESHOLD_MAX = 0.3;
export const POSTGRES_TYPO_STATEMENT_TIMEOUT_MS = 500;
export const POSTGRES_TYPO_MAX_PREFILTER_CANDIDATES_PER_TERM = 4_096;
export const POSTGRES_TYPO_MAX_VERIFIED_CANDIDATES_PER_TERM = 1_024;
export const POSTGRES_TYPO_MAX_CANDIDATE_WORK_PER_QUERY = 8_192;

export interface PostgresTypoCompilerContext {
  readonly storeId: string;
  readonly locale: string;
}

export interface CompiledPostgresTypoLookup {
  readonly compilerVersion: string;
  readonly candidateSql: SQL;
}

export class PostgresTypoQueryCompiler {
  compileDistanceOneCandidates(
    surfaceTerm: string,
    context: PostgresTypoCompilerContext,
  ): CompiledPostgresTypoLookup {
    if (!context.storeId || !context.locale || !surfaceTerm) {
      throw indexUnavailable("Typo compiler requires tenant, locale and input term");
    }
    const codePointLength = [...surfaceTerm].length;
    if (codePointLength < 4 || codePointLength > 64) {
      throw indexUnavailable("Typo compiler received an out-of-range input term");
    }

    const candidateSql = sql`
      WITH
      timeout_settings AS MATERIALIZED (
        SELECT current_setting('statement_timeout') AS previous_timeout
      ),
      timeout_guard AS MATERIALIZED (
        SELECT set_config(
          'statement_timeout',
          CASE
            WHEN settings.previous_timeout = '0'
              OR extract(epoch FROM settings.previous_timeout::interval) * 1000
                > ${POSTGRES_TYPO_STATEMENT_TIMEOUT_MS}
              THEN ${`${POSTGRES_TYPO_STATEMENT_TIMEOUT_MS}ms`}
            ELSE settings.previous_timeout
          END,
          true
        ) AS configured
        FROM timeout_settings settings
      ),
      trigram_prefilter AS MATERIALIZED (
        SELECT
          dictionary.term,
          similarity(dictionary.term, ${surfaceTerm})::double precision
            AS trigram_similarity
        FROM listing.search_term_dictionary dictionary
        CROSS JOIN timeout_guard
        WHERE dictionary.store_id = ${context.storeId}::uuid
          AND dictionary.locale = ${context.locale}
          AND dictionary.code_point_length BETWEEN
            ${codePointLength - 1} AND ${codePointLength + 1}
          AND dictionary.term % ${surfaceTerm}
      ),
      verified AS MATERIALIZED (
        SELECT
          candidate.term,
          candidate.trigram_similarity,
          levenshtein_less_equal(candidate.term, ${surfaceTerm}, 1)::int
            AS edit_distance
        FROM trigram_prefilter candidate
        WHERE levenshtein_less_equal(candidate.term, ${surfaceTerm}, 1) <= 1
      ),
      work_summary AS MATERIALIZED (
        SELECT
          (SELECT count(*)::int FROM trigram_prefilter) AS prefilter_count,
          (SELECT count(*)::int FROM verified) AS verified_count
      ),
      timeout_restore AS MATERIALIZED (
        SELECT set_config(
          'statement_timeout',
          settings.previous_timeout,
          true
        ) AS restored
        FROM timeout_settings settings
        CROSS JOIN work_summary
      )
      SELECT
        verified.term AS "term",
        verified.trigram_similarity AS "trigramSimilarity",
        verified.edit_distance AS "editDistance",
        work_summary.prefilter_count AS "prefilterCount",
        work_summary.verified_count AS "verifiedCount"
      FROM work_summary
      CROSS JOIN timeout_restore
      LEFT JOIN verified ON true
      ORDER BY
        verified.edit_distance ASC NULLS LAST,
        verified.trigram_similarity DESC NULLS LAST,
        verified.term ASC NULLS LAST
    `;

    return Object.freeze({
      compilerVersion: POSTGRES_TYPO_COMPILER_VERSION,
      candidateSql,
    });
  }
}
