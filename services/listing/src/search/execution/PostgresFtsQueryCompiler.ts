import { sql, type SQL } from "drizzle-orm";
import type { SearchTextField } from "../../repositories/search/searchRepositoryTypes.js";
import { indexUnavailable } from "../errors.js";
import { SearchFieldRegistry } from "../planner/SearchFieldRegistry.js";
import type {
  ExpandedFuzzySearchQueryPlan,
  SearchClause,
  SearchQueryPlan,
  SearchRequiredUnit,
  VerifiedTypoAlternative,
} from "../planner/types.js";

export const POSTGRES_FTS_COMPILER_VERSION = "1";
const MAX_FUZZY_COMBINATIONS_PER_UNIT = 1_024;
const MAX_FUZZY_COMBINATIONS_PER_QUERY = 1_024;

export interface PostgresFtsCompilerContext {
  readonly storeId: string;
  readonly locale: string;
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
  readonly fieldWeights: Readonly<Partial<Record<SearchTextField, number>>>;
}

export interface CompiledPostgresFtsQuery {
  readonly compilerVersion: string;
  readonly fingerprint: string;
  readonly membershipCandidateRelationSql: SQL;
  readonly rankedCandidateRelationSql: SQL;
  readonly membershipBitmapSql: SQL;
}

export interface PostgresFtsFuzzyClauseDescription {
  readonly lexemes: readonly string[];
  readonly fields: readonly SearchTextField[];
  readonly requireSameElement: boolean;
}

export interface PostgresFtsFuzzyUnitDescription {
  readonly unitIndex: number;
  readonly clauses: readonly PostgresFtsFuzzyClauseDescription[];
}

export interface PostgresFtsFuzzyExecutionDescription {
  readonly executed: boolean;
  readonly units: readonly PostgresFtsFuzzyUnitDescription[];
}

export class PostgresFtsQueryCompiler {
  constructor(private readonly fields = new SearchFieldRegistry()) {}

  compilePrimary(
    plan: SearchQueryPlan,
    context: PostgresFtsCompilerContext,
  ): CompiledPostgresFtsQuery {
    validateContext(plan, context, this.fields);
    if (plan.requiredUnits.length === 0) {
      throw indexUnavailable("PRIMARY search plan has no required units");
    }

    const rankedCandidateRelationSql = compileBoostedCandidateRelation(
      compileCandidateRelation(plan, context, true),
      plan.applicableBoostProductIds,
      context,
    );
    const membershipCandidateRelationSql = compileBoostedCandidateRelation(
      compileCandidateRelation(plan, context, false),
      plan.applicableBoostProductIds,
      context,
    );
    const membershipBitmapSql = sql`
      SELECT COALESCE(
        rb_build_agg(candidate.product_doc_id),
        (
          SELECT rb_build_agg(empty_doc_id) - rb_build_agg(empty_doc_id)
          FROM (VALUES (0)) AS empty_bitmap_seed(empty_doc_id)
        )
      ) AS bitmap
      FROM (${membershipCandidateRelationSql}) AS candidate
      WHERE candidate.store_id = ${context.storeId}::uuid
    `;

    return Object.freeze({
      compilerVersion: POSTGRES_FTS_COMPILER_VERSION,
      fingerprint: plan.fingerprint,
      membershipCandidateRelationSql,
      rankedCandidateRelationSql,
      membershipBitmapSql,
    });
  }

  compileFuzzy(
    plan: ExpandedFuzzySearchQueryPlan,
    context: PostgresFtsCompilerContext,
  ): CompiledPostgresFtsQuery {
    validateCommonContext(plan, context, this.fields);
    validateFuzzyPlan(plan, this.fields);
    const hasEmptyUnit = !hasCompleteFuzzyPlan(plan);
    const baseRankedCandidateRelationSql = hasEmptyUnit
      ? compileEmptyCandidateRelation()
      : compileFuzzyCandidateRelation(plan, context, true);
    const baseMembershipCandidateRelationSql = hasEmptyUnit
      ? compileEmptyCandidateRelation()
      : compileFuzzyCandidateRelation(plan, context, false);
    const rankedCandidateRelationSql = compileBoostedCandidateRelation(
      baseRankedCandidateRelationSql,
      plan.applicableBoostProductIds,
      context,
    );
    const membershipCandidateRelationSql = compileBoostedCandidateRelation(
      baseMembershipCandidateRelationSql,
      plan.applicableBoostProductIds,
      context,
    );
    const membershipBitmapSql = sql`
      SELECT COALESCE(
        rb_build_agg(candidate.product_doc_id),
        (
          SELECT rb_build_agg(empty_doc_id) - rb_build_agg(empty_doc_id)
          FROM (VALUES (0)) AS empty_bitmap_seed(empty_doc_id)
        )
      ) AS bitmap
      FROM (${membershipCandidateRelationSql}) AS candidate
      WHERE candidate.store_id = ${context.storeId}::uuid
    `;

    return Object.freeze({
      compilerVersion: POSTGRES_FTS_COMPILER_VERSION,
      fingerprint: plan.fingerprint,
      membershipCandidateRelationSql,
      rankedCandidateRelationSql,
      membershipBitmapSql,
    });
  }

  describeFuzzyExecution(plan: ExpandedFuzzySearchQueryPlan): PostgresFtsFuzzyExecutionDescription {
    validateFuzzyPlan(plan, this.fields);
    if (!hasCompleteFuzzyPlan(plan)) {
      return Object.freeze({
        executed: false,
        units: Object.freeze([]),
      });
    }

    return Object.freeze({
      executed: true,
      units: Object.freeze(
        plan.requiredUnits.map((unit) =>
          Object.freeze({
            unitIndex: unit.index,
            clauses: Object.freeze(
              buildFuzzyCombinations(
                unit,
                plan.verifiedAlternativesByUnit.get(unit.index) ?? [],
              ).map((combination) => {
                const lexemes = combination.alternatives.flatMap(
                  (alternative) => alternative.ftsLexemes,
                );
                return Object.freeze({
                  lexemes: Object.freeze(lexemes),
                  fields: Object.freeze([...combination.fields]),
                  requireSameElement: combination.requireSameElement,
                });
              }),
            ),
          }),
        ),
      ),
    });
  }
}

function compileBoostedCandidateRelation(
  baseRelation: SQL,
  productIds: readonly string[],
  context: PostgresFtsCompilerContext,
): SQL {
  const uniqueProductIds = [...new Set(productIds)].sort();
  if (uniqueProductIds.length === 0) {
    return sql`
      SELECT
        base.store_id,
        base.product_doc_id,
        base.product_id,
        base.identifier_priority,
        false AS boosted,
        false AS boost_only,
        base.relevance_rank,
        base.total_edit_distance,
        base.minimum_trigram_similarity
      FROM (${baseRelation}) base
      WHERE base.store_id = ${context.storeId}::uuid
    `;
  }
  const values = sql.join(
    uniqueProductIds.map((productId) => sql`(${productId}::uuid)`),
    sql`, `,
  );
  return sql`
    WITH
    base_candidates AS MATERIALIZED (
      ${baseRelation}
    ),
    boost_candidates AS MATERIALIZED (
      SELECT
        product.store_id,
        product.product_doc_id,
        product.product_id
      FROM (VALUES ${values}) boost_product(product_id)
      JOIN listing.product_listing_index product
        ON product.store_id = ${context.storeId}::uuid
       AND product.product_id = boost_product.product_id
      WHERE product.store_id = ${context.storeId}::uuid
    ),
    candidate_ids AS MATERIALIZED (
      SELECT base.store_id, base.product_doc_id, base.product_id
      FROM base_candidates base
      WHERE base.store_id = ${context.storeId}::uuid
      UNION
      SELECT boost.store_id, boost.product_doc_id, boost.product_id
      FROM boost_candidates boost
      WHERE boost.store_id = ${context.storeId}::uuid
    )
    SELECT
      candidate.store_id,
      candidate.product_doc_id,
      candidate.product_id,
      COALESCE(base.identifier_priority, 1)::int AS identifier_priority,
      (boost.product_id IS NOT NULL) AS boosted,
      (base.product_id IS NULL AND boost.product_id IS NOT NULL) AS boost_only,
      COALESCE(base.relevance_rank, 0)::double precision AS relevance_rank,
      COALESCE(base.total_edit_distance, 0)::int AS total_edit_distance,
      COALESCE(base.minimum_trigram_similarity, 1)::double precision
        AS minimum_trigram_similarity
    FROM candidate_ids candidate
    LEFT JOIN base_candidates base
      ON base.store_id = ${context.storeId}::uuid
     AND base.store_id = candidate.store_id
     AND base.product_doc_id = candidate.product_doc_id
     AND base.product_id = candidate.product_id
    LEFT JOIN boost_candidates boost
      ON boost.store_id = ${context.storeId}::uuid
     AND boost.store_id = candidate.store_id
     AND boost.product_doc_id = candidate.product_doc_id
     AND boost.product_id = candidate.product_id
    WHERE candidate.store_id = ${context.storeId}::uuid
  `;
}

function compileCandidateRelation(
  plan: SearchQueryPlan,
  context: PostgresFtsCompilerContext,
  includeRank: boolean,
): SQL {
  const semanticRelation = compileSemanticRelation(plan, context, includeRank);
  const wholeIdentifierRelation = compileWholeIdentifierRelation(plan, context, includeRank);
  return wholeIdentifierRelation
    ? sql`
          SELECT
            candidates.store_id,
            candidates.product_doc_id,
            candidates.product_id,
            MAX(candidates.identifier_priority)::int AS identifier_priority,
            MAX(candidates.relevance_rank)::double precision AS relevance_rank,
            0::int AS total_edit_distance,
            1::double precision AS minimum_trigram_similarity
          FROM (
            ${semanticRelation}
            UNION ALL
            ${wholeIdentifierRelation}
          ) AS candidates
          GROUP BY
            candidates.store_id,
            candidates.product_doc_id,
            candidates.product_id
        `
    : semanticRelation;
}

function compileSemanticRelation(
  plan: SearchQueryPlan,
  context: PostgresFtsCompilerContext,
  includeRank: boolean,
): SQL {
  const unitRelations = plan.requiredUnits.map((unit) =>
    compileUnitRelation(unit, context, includeRank),
  );
  const aliases = unitRelations.map((_, index) => `search_unit_${index}`);
  const firstAlias = sql.identifier(aliases[0]!);
  const joins = unitRelations.slice(1).map((relation, offset) => {
    const alias = sql.identifier(aliases[offset + 1]!);
    return sql`
      JOIN (${relation}) AS ${alias}
        ON ${alias}.store_id = ${firstAlias}.store_id
       AND ${alias}.product_doc_id = ${firstAlias}.product_doc_id
       AND ${alias}.product_id = ${firstAlias}.product_id
    `;
  });
  const rank = aliases
    .map((alias) => sql`${sql.identifier(alias)}.unit_rank`)
    .reduce((sum, value) => sql`(${sum} + ${value})`);
  const identifierPriority = aliases
    .map((alias) => sql`${sql.identifier(alias)}.identifier_priority`)
    .reduce((maximum, value) => sql`GREATEST(${maximum}, ${value})`);

  return sql`
    SELECT
      ${firstAlias}.store_id,
      ${firstAlias}.product_doc_id,
      ${firstAlias}.product_id,
      ${identifierPriority}::int AS identifier_priority,
      ${rank}::double precision AS relevance_rank,
      0::int AS total_edit_distance,
      1::double precision AS minimum_trigram_similarity
    FROM (${unitRelations[0]!}) AS ${firstAlias}
    ${sql.join(joins, sql` `)}
  `;
}

function compileUnitRelation(
  unit: SearchRequiredUnit,
  context: PostgresFtsCompilerContext,
  includeRank: boolean,
): SQL {
  const alternatives = [
    ...unit.primaryAlternatives.flatMap((clause) =>
      compileClauseRelations(clause, context, includeRank),
    ),
    ...unit.originalIdentifierAlternatives.flatMap((clause) =>
      compileClauseRelations(clause, context, includeRank),
    ),
  ];
  if (alternatives.length === 0) {
    throw indexUnavailable(`Search unit ${unit.index} has no PRIMARY clauses`);
  }

  return sql`
    SELECT
      matches.store_id,
      matches.product_doc_id,
      matches.product_id,
      MAX(matches.identifier_priority)::int AS identifier_priority,
      MAX(matches.element_rank)::double precision AS unit_rank
    FROM (
      ${sql.join(alternatives, sql` UNION ALL `)}
    ) AS matches
    GROUP BY
      matches.store_id,
      matches.product_doc_id,
      matches.product_id
  `;
}

function compileWholeIdentifierRelation(
  plan: SearchQueryPlan,
  context: PostgresFtsCompilerContext,
  includeRank: boolean,
): SQL | null {
  const alternatives = plan.wholeQueryIdentifierAlternatives.flatMap((clause) =>
    compileClauseRelations(clause, context, includeRank),
  );
  if (alternatives.length === 0) return null;
  return sql`
    SELECT
      matches.store_id,
      matches.product_doc_id,
      matches.product_id,
      MAX(matches.identifier_priority)::int AS identifier_priority,
      0::double precision AS relevance_rank,
      0::int AS total_edit_distance,
      1::double precision AS minimum_trigram_similarity
    FROM (
      ${sql.join(alternatives, sql` UNION ALL `)}
    ) AS matches
    GROUP BY
      matches.store_id,
      matches.product_doc_id,
      matches.product_id
  `;
}

function compileClauseRelations(
  clause: SearchClause,
  context: PostgresFtsCompilerContext,
  includeRank: boolean,
): readonly SQL[] {
  switch (clause.kind) {
    case "ftsTerms":
      return [compileTextClause(clause, context, false, includeRank)];
    case "ftsPhrase":
      if (!clause.requireSameElement) {
        throw indexUnavailable("FTS phrase must require one field element");
      }
      return [compileTextClause(clause, context, true, includeRank)];
    case "synonym":
      return clause.alternatives.flatMap((alternative) =>
        compileClauseRelations(alternative, context, includeRank),
      );
    case "identifierExact":
      return [compileIdentifierClause(clause.value, context, false)];
    case "identifierPrefix":
      return [compileIdentifierClause(clause.value, context, true)];
    case "typoTerms":
      throw indexUnavailable("Typo clauses cannot be compiled in PRIMARY mode");
  }
}

function compileFuzzyCandidateRelation(
  plan: ExpandedFuzzySearchQueryPlan,
  context: PostgresFtsCompilerContext,
  includeRank: boolean,
): SQL {
  const unitRelations = plan.requiredUnits.map((unit) =>
    compileFuzzyUnitRelation(
      unit,
      plan.verifiedAlternativesByUnit.get(unit.index) ?? [],
      context,
      includeRank,
    ),
  );
  const aliases = unitRelations.map((_, index) => `fuzzy_unit_${index}`);
  const firstAlias = sql.identifier(aliases[0]!);
  const joins = unitRelations.slice(1).map((relation, offset) => {
    const alias = sql.identifier(aliases[offset + 1]!);
    return sql`
      JOIN (${relation}) AS ${alias}
        ON ${alias}.store_id = ${firstAlias}.store_id
       AND ${alias}.product_doc_id = ${firstAlias}.product_doc_id
       AND ${alias}.product_id = ${firstAlias}.product_id
    `;
  });
  const relevanceRank = aliases
    .map((alias) => sql`${sql.identifier(alias)}.unit_rank`)
    .reduce((sum, value) => sql`(${sum} + ${value})`);
  const totalEditDistance = aliases
    .map((alias) => sql`${sql.identifier(alias)}.total_edit_distance`)
    .reduce((sum, value) => sql`(${sum} + ${value})`);
  const minimumSimilarity = aliases
    .map((alias) => sql`${sql.identifier(alias)}.minimum_trigram_similarity`)
    .reduce((minimum, value) => sql`LEAST(${minimum}, ${value})`);

  return sql`
    SELECT
      ${firstAlias}.store_id,
      ${firstAlias}.product_doc_id,
      ${firstAlias}.product_id,
      1::int AS identifier_priority,
      ${relevanceRank}::double precision AS relevance_rank,
      ${totalEditDistance}::int AS total_edit_distance,
      ${minimumSimilarity}::double precision AS minimum_trigram_similarity
    FROM (${unitRelations[0]!}) AS ${firstAlias}
    ${sql.join(joins, sql` `)}
  `;
}

function compileFuzzyUnitRelation(
  unit: SearchRequiredUnit,
  alternatives: readonly VerifiedTypoAlternative[],
  context: PostgresFtsCompilerContext,
  includeRank: boolean,
): SQL {
  const combinations = buildFuzzyCombinations(unit, alternatives);
  if (combinations.length === 0) {
    return compileEmptyUnitRelation();
  }
  const relations = combinations.map((combination) => {
    const lexemes = combination.alternatives.flatMap((alternative) => alternative.ftsLexemes);
    const clause = Object.freeze({
      kind: "ftsTerms" as const,
      text: lexemes.join(" "),
      lexemes: Object.freeze(lexemes),
      fields: combination.fields,
    });
    const relation = compileTextClause(clause, context, false, includeRank);
    const totalEditDistance = combination.alternatives.reduce(
      (total, alternative) => total + alternative.editDistance,
      0,
    );
    const minimumSimilarity = Math.min(
      ...combination.alternatives.map((alternative) => alternative.trigramSimilarity),
    );
    return sql`
      SELECT
        matches.store_id,
        matches.product_doc_id,
        matches.product_id,
        matches.element_rank,
        ${totalEditDistance}::int AS total_edit_distance,
        ${minimumSimilarity}::double precision AS minimum_trigram_similarity
      FROM (${relation}) matches
    `;
  });

  return sql`
    SELECT DISTINCT ON (
      matches.store_id,
      matches.product_doc_id,
      matches.product_id
    )
      matches.store_id,
      matches.product_doc_id,
      matches.product_id,
      matches.element_rank::double precision AS unit_rank,
      matches.total_edit_distance::int AS total_edit_distance,
      matches.minimum_trigram_similarity::double precision
        AS minimum_trigram_similarity
    FROM (${sql.join(relations, sql` UNION ALL `)}) matches
    ORDER BY
      matches.store_id,
      matches.product_doc_id,
      matches.product_id,
      matches.total_edit_distance ASC,
      matches.minimum_trigram_similarity DESC,
      matches.element_rank DESC
  `;
}

function buildFuzzyCombinations(
  unit: SearchRequiredUnit,
  alternatives: readonly VerifiedTypoAlternative[],
): readonly {
  readonly alternatives: readonly VerifiedTypoAlternative[];
  readonly fields: readonly SearchTextField[];
  readonly requireSameElement: boolean;
}[] {
  const typoClause = unit.originalTypoAlternative;
  if (!typoClause || typoClause.kind !== "typoTerms") return [];
  const byInputTerm = new Map<string, VerifiedTypoAlternative[]>();
  for (const alternative of alternatives) {
    const values = byInputTerm.get(alternative.inputTerm) ?? [];
    values.push(alternative);
    byInputTerm.set(alternative.inputTerm, values);
  }
  const orderedTerms = typoClause.terms;
  if (orderedTerms.some((term) => !byInputTerm.get(term)?.length)) return [];

  const combinations: VerifiedTypoAlternative[][] = [[]];
  for (const term of orderedTerms) {
    const candidates = byInputTerm.get(term)!;
    const next: VerifiedTypoAlternative[][] = [];
    for (const combination of combinations) {
      for (const candidate of candidates) {
        next.push([...combination, candidate]);
        if (next.length > MAX_FUZZY_COMBINATIONS_PER_UNIT) {
          throw indexUnavailable("Expanded typo plan exceeds combination limits");
        }
      }
    }
    combinations.splice(0, combinations.length, ...next);
  }
  return Object.freeze(
    combinations.map((values) =>
      Object.freeze({
        alternatives: Object.freeze(values),
        fields: typoClause.fields,
        requireSameElement:
          typoClause.requireSameElement || values.some((value) => value.ftsLexemes.length > 1),
      }),
    ),
  );
}

function hasCompleteTypoAlternatives(
  unit: SearchRequiredUnit,
  alternativesByUnit: ReadonlyMap<number, readonly VerifiedTypoAlternative[]>,
): boolean {
  const typoClause = unit.originalTypoAlternative;
  if (!typoClause || typoClause.kind !== "typoTerms") return false;
  const inputTerms = new Set(
    (alternativesByUnit.get(unit.index) ?? []).map((alternative) => alternative.inputTerm),
  );
  return typoClause.terms.every((term) => inputTerms.has(term));
}

function hasCompleteFuzzyPlan(plan: ExpandedFuzzySearchQueryPlan): boolean {
  return plan.requiredUnits.every((unit) =>
    hasCompleteTypoAlternatives(unit, plan.verifiedAlternativesByUnit),
  );
}

function compileEmptyCandidateRelation(): SQL {
  return sql`
    SELECT
      NULL::uuid AS store_id,
      NULL::int AS product_doc_id,
      NULL::uuid AS product_id,
      1::int AS identifier_priority,
      0::double precision AS relevance_rank,
      0::int AS total_edit_distance,
      0::double precision AS minimum_trigram_similarity
    WHERE false
  `;
}

function compileEmptyUnitRelation(): SQL {
  return sql`
    SELECT
      NULL::uuid AS store_id,
      NULL::int AS product_doc_id,
      NULL::uuid AS product_id,
      0::double precision AS unit_rank,
      0::int AS total_edit_distance,
      0::double precision AS minimum_trigram_similarity
    WHERE false
  `;
}

function compileTextClause(
  clause: Extract<SearchClause, { kind: "ftsTerms" | "ftsPhrase" }>,
  context: PostgresFtsCompilerContext,
  phrase: boolean,
  includeRank: boolean,
): SQL {
  if (!clause.text || clause.lexemes.length === 0) {
    throw indexUnavailable("FTS clause contains no prepared lexemes");
  }
  const fields = [...new Set(clause.fields)];
  if (fields.length === 0) {
    throw indexUnavailable("FTS clause contains no fields");
  }
  const query = phrase
    ? sql`phraseto_tsquery('pg_catalog.simple'::regconfig, ${clause.text})`
    : sql`plainto_tsquery('pg_catalog.simple'::regconfig, ${clause.text})`;
  const fieldValues = sql.join(
    fields.map((field) => sql`${field}`),
    sql`, `,
  );
  const rank = includeRank
    ? sql`(
        ts_rank_cd(element.search_vector, ${query})::double precision
        * ${compileFieldWeight(fields, context.fieldWeights)}::double precision
      )`
    : sql`0::double precision`;

  return sql`
    SELECT
      element.store_id,
      element.product_doc_id,
      element.product_id,
      1::int AS identifier_priority,
      ${rank} AS element_rank
    FROM listing.product_search_text AS element
    WHERE element.store_id = ${context.storeId}::uuid
      AND element.locale = ${context.locale}
      AND element.normalization_contract_version =
        ${context.normalizationContractVersion}
      AND element.normalization_profile_hash =
        ${context.normalizationProfileHash}
      AND element.field IN (${fieldValues})
      AND element.search_vector @@ ${query}
  `;
}

function compileIdentifierClause(
  value: string,
  context: PostgresFtsCompilerContext,
  prefix: boolean,
): SQL {
  if (!value) throw indexUnavailable("Identifier clause is empty");
  if (prefix && [...value].length < 3) {
    throw indexUnavailable("Identifier prefix must contain at least 3 code points");
  }
  const predicate = prefix
    ? sql`identifier.normalized_value LIKE
        replace(replace(replace(${value}, '!', '!!'), '%', '!%'), '_', '!_') || '%'
        ESCAPE '!'`
    : sql`identifier.normalized_value = ${value}`;

  return sql`
    SELECT
      identifier.store_id,
      identifier.product_doc_id,
      identifier.product_id,
      ${prefix ? 2 : 3}::int AS identifier_priority,
      0::double precision AS element_rank
    FROM listing.product_search_identifier AS identifier
    WHERE identifier.store_id = ${context.storeId}::uuid
      AND identifier.locale = ${context.locale}
      AND identifier.kind = 'SKU'
      AND ${predicate}
  `;
}

function compileFieldWeight(
  fields: readonly SearchTextField[],
  weights: PostgresFtsCompilerContext["fieldWeights"],
): SQL {
  const cases = fields.map((field) => {
    const weight = weights[field];
    if (weight === undefined || !Number.isFinite(weight) || weight <= 0) {
      throw indexUnavailable(`Invalid runtime weight for search field: ${field}`);
    }
    return sql`WHEN ${field} THEN ${weight}`;
  });
  return sql`CASE element.field ${sql.join(cases, sql` `)} ELSE 0 END`;
}

function validateContext(
  plan: SearchQueryPlan,
  context: PostgresFtsCompilerContext,
  fields: SearchFieldRegistry,
): void {
  validateCommonContext(plan, context, fields);
  validatePrimaryPlan(plan, fields);
}

function validateCommonContext(
  plan: SearchQueryPlan,
  context: PostgresFtsCompilerContext,
  fields: SearchFieldRegistry,
): void {
  if (!context.storeId || !context.locale) {
    throw indexUnavailable("Search compiler requires tenant and locale");
  }
  if (
    plan.applicableBoostProductIds.some(
      (productId) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(productId),
    )
  ) {
    throw indexUnavailable("Search plan contains an invalid boost product ID");
  }
  if (
    context.normalizationContractVersion !== plan.normalizationContractVersion ||
    context.normalizationProfileHash !== plan.normalizationProfileHash
  ) {
    throw indexUnavailable(
      "Search plan normalization profile does not match the active index profile",
    );
  }
  for (const field of plan.enabledFields) {
    fields.get(field);
    const weight = context.fieldWeights[field];
    if (weight === undefined || !Number.isFinite(weight) || weight <= 0) {
      throw indexUnavailable(`Missing runtime weight for search field: ${field}`);
    }
  }
}

function validateFuzzyPlan(plan: ExpandedFuzzySearchQueryPlan, fields: SearchFieldRegistry): void {
  if (plan.requiredUnits.length === 0) {
    throw indexUnavailable("FUZZY search plan has no required units");
  }
  const enabled = new Set(plan.enabledFields);
  let combinationCount = 0;
  plan.requiredUnits.forEach((unit, index) => {
    if (unit.index !== index) {
      throw indexUnavailable("FUZZY plan contains invalid required units");
    }
    const typoClause = unit.originalTypoAlternative;
    if (!typoClause || typoClause.kind !== "typoTerms") {
      return;
    }
    if (
      typoClause.maxDistance !== 1 ||
      typoClause.terms.length === 0 ||
      typoClause.terms.some((term) => !term)
    ) {
      throw indexUnavailable("FUZZY plan contains an invalid typo clause");
    }
    for (const field of typoClause.fields) {
      fields.get(field);
      if (!enabled.has(field)) {
        throw indexUnavailable(`Typo clause uses a disabled search field: ${field}`);
      }
    }
    const alternatives = plan.verifiedAlternativesByUnit.get(unit.index) ?? [];
    const candidateCounts = typoClause.terms.map(
      (term) => alternatives.filter((alternative) => alternative.inputTerm === term).length,
    );
    const unitCombinationCount = candidateCounts.reduce(
      (count, candidateCount) => count * candidateCount,
      1,
    );
    if (unitCombinationCount > MAX_FUZZY_COMBINATIONS_PER_UNIT) {
      throw indexUnavailable("Expanded typo unit exceeds combination limits");
    }
    combinationCount += unitCombinationCount;
    if (combinationCount > MAX_FUZZY_COMBINATIONS_PER_QUERY) {
      throw indexUnavailable("Expanded typo query exceeds combination limits");
    }
  });
}

function validatePrimaryPlan(plan: SearchQueryPlan, fields: SearchFieldRegistry): void {
  const enabled = new Set(plan.enabledFields);
  const validateClause = (clause: SearchClause): void => {
    switch (clause.kind) {
      case "ftsTerms":
      case "ftsPhrase": {
        if (
          clause.lexemes.length === 0 ||
          clause.text !== clause.lexemes.join(" ") ||
          clause.lexemes.some((lexeme) => !lexeme || /\s/u.test(lexeme))
        ) {
          throw indexUnavailable("FTS plan contains invalid prepared lexemes");
        }
        for (const field of clause.fields) {
          fields.get(field);
          if (!enabled.has(field)) {
            throw indexUnavailable(`FTS clause uses a disabled search field: ${field}`);
          }
        }
        return;
      }
      case "synonym":
        if (!clause.groupId || clause.alternatives.length === 0) {
          throw indexUnavailable("Synonym clause is empty");
        }
        clause.alternatives.forEach(validateClause);
        return;
      case "identifierExact":
      case "identifierPrefix":
        if (!clause.value) {
          throw indexUnavailable("Identifier clause is empty");
        }
        return;
      case "typoTerms":
        throw indexUnavailable("PRIMARY plan contains a typo clause");
    }
  };

  plan.requiredUnits.forEach((unit, index) => {
    if (unit.index !== index || unit.primaryAlternatives.length === 0) {
      throw indexUnavailable("PRIMARY plan contains invalid required units");
    }
    unit.primaryAlternatives.forEach(validateClause);
    unit.originalIdentifierAlternatives.forEach(validateClause);
  });
  plan.wholeQueryIdentifierAlternatives.forEach(validateClause);
}
