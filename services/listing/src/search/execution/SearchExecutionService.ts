import { sql, type SQL } from "drizzle-orm";
import { getContext } from "../../context/index.js";
import type { Database } from "../../infrastructure/db/database.js";
import type { SearchSettings } from "../../repositories/models/index.js";
import type { SearchSettingsRepository } from "../../repositories/search/SearchSettingsRepository.js";
import type {
  SearchOutOfStockPolicy,
  SearchTextField,
} from "../../repositories/search/searchRepositoryTypes.js";
import type { SearchConfigurationService } from "../configuration/index.js";
import { indexUnavailable, SearchRuntimeError } from "../errors.js";
import { SearchQueryNormalizer } from "../normalization/SearchQueryNormalizer.js";
import type {
  LexicalizedSearchQuery,
  NormalizedSearchQuery,
  SearchQueryNormalizationResult,
} from "../normalization/types.js";
import { SearchFieldRegistry } from "../planner/SearchFieldRegistry.js";
import { SearchQueryPlanBuilder } from "../planner/SearchQueryPlanBuilder.js";
import type {
  CompiledLocaleSynonyms,
  ExpandedFuzzySearchQueryPlan,
  SearchQueryPlan,
  VerifiedTypoAlternative,
} from "../planner/types.js";
import {
  PostgresFtsQueryCompiler,
  type PostgresFtsCompilerContext,
} from "./PostgresFtsQueryCompiler.js";
import {
  assertPostgresSearchRuntimeCompatible,
  compilePostgresSearchRuntimeProbeSql,
  compilePostgresTypoRuntimeProbeSql,
  type PostgresSearchRuntimeObservation,
} from "./PostgresSearchRuntimeContract.js";
import {
  POSTGRES_TYPO_MAX_CANDIDATE_WORK_PER_QUERY,
  POSTGRES_TYPO_MAX_PREFILTER_CANDIDATES_PER_TERM,
  POSTGRES_TYPO_MAX_VERIFIED_CANDIDATES_PER_TERM,
  PostgresTypoQueryCompiler,
} from "./PostgresTypoQueryCompiler.js";

export const SEARCH_MEMBERSHIP_BITMAP_MAX_SERIALIZED_BYTES = 64 * 1024 * 1024;

export type SearchDiagnosticsMode = "NONE" | "PREVIEW";
export type SearchExecutionMode = "PRIMARY" | "FUZZY";

export interface SearchRequestSettings {
  readonly version: number;
  readonly enabledFields: readonly SearchTextField[];
  readonly fieldWeights: Readonly<Partial<Record<SearchTextField, number>>>;
  readonly typoToleranceEnabled: boolean;
  readonly outOfStockPolicy: SearchOutOfStockPolicy;
}

export interface ApplicableProductBoost {
  readonly boostId: string;
  readonly version: number;
  readonly productIds: readonly string[];
}

export interface SearchRequestConfiguration {
  readonly settings: SearchRequestSettings;
  readonly synonyms: CompiledLocaleSynonyms;
  readonly boosts: readonly ApplicableProductBoost[];
}

export interface SearchRequestContext {
  readonly storeId: string;
  readonly locale: string;
  readonly normalizedQuery: NormalizedSearchQuery;
  readonly lexicalizedQuery: LexicalizedSearchQuery;
  readonly configuration: SearchRequestConfiguration;
  readonly diagnosticsMode: SearchDiagnosticsMode;
}

export interface SearchAttemptContext {
  readonly request: SearchRequestContext;
  readonly mode: SearchExecutionMode;
}

export interface SearchCandidateContract {
  readonly request: SearchRequestContext;
  readonly attempt: SearchAttemptContext;
  readonly plan: SearchQueryPlan;
  readonly membershipBitmap: string;
  readonly membershipCardinality: number;
  readonly membershipSerializedBytes: number;
  readonly boostOnlyCandidateCount: number;
  readonly rankedCandidateRelationSql: SQL;
}

export interface SearchExecutionInput {
  readonly locale: string;
  readonly query: string;
  readonly mode?: SearchExecutionMode;
  readonly diagnosticsMode?: SearchDiagnosticsMode;
}

export interface SearchExecutionDependencies {
  readonly connection: () => Database;
  readonly settings: SearchSettingsRepository;
  readonly configuration: SearchConfigurationService;
}

interface SearchMembershipSqlRow extends Record<string, unknown> {
  membershipBitmap: string;
  membershipCardinality: number;
  membershipSerializedBytes: number;
  boostOnlyCandidateCount: number;
}

interface TypoCandidateSqlRow extends Record<string, unknown> {
  term: string | null;
  trigramSimilarity: number | string | null;
  editDistance: number | null;
  prefilterCount: number;
  verifiedCount: number;
}

export class SearchExecutionService {
  constructor(
    private readonly dependencies: SearchExecutionDependencies,
    private readonly normalizer = new SearchQueryNormalizer(),
    private readonly planBuilder = new SearchQueryPlanBuilder(),
    private readonly compiler = new PostgresFtsQueryCompiler(),
    private readonly typoCompiler = new PostgresTypoQueryCompiler(),
    private readonly fields = new SearchFieldRegistry(),
  ) {}

  async execute(input: SearchExecutionInput): Promise<SearchCandidateContract> {
    const startedAt = Date.now();
    try {
      const request = await this.resolveRequestContext(input);
      const plan = this.planBuilder.buildPrimary({
        lexicalizedQuery: request.lexicalizedQuery,
        enabledFields: request.configuration.settings.enabledFields,
        synonyms: request.configuration.synonyms,
        applicableBoostProductIds: request.configuration.boosts.flatMap(
          (boost) => boost.productIds,
        ),
      });
      if (input.mode !== undefined && input.mode !== "PRIMARY" && input.mode !== "FUZZY") {
        throw indexUnavailable("Unsupported search execution mode");
      }

      await this.assertRuntimeCompatible(false);
      if (input.mode === "FUZZY") {
        return await this.executeFuzzy(request, plan, startedAt);
      }

      const primary = await this.materializeContract(request, plan, "PRIMARY");
      if (
        input.mode === "PRIMARY" ||
        primary.membershipCardinality > 0 ||
        !request.configuration.settings.typoToleranceEnabled ||
        !canRunTypoAttempt(request)
      ) {
        this.logMaterializedContract(primary, startedAt);
        return primary;
      }

      return await this.executeFuzzy(request, plan, startedAt);
    } catch (error) {
      if (error instanceof SearchRuntimeError) throw error;
      throw indexUnavailable("Canonical search execution failed", error);
    }
  }

  private async executeFuzzy(
    request: SearchRequestContext,
    primaryPlan: SearchQueryPlan,
    startedAt: number,
  ): Promise<SearchCandidateContract> {
    if (!request.configuration.settings.typoToleranceEnabled) {
      throw indexUnavailable("FUZZY continuation is disabled by current settings");
    }
    if (!canRunTypoAttempt(request)) {
      throw indexUnavailable("FUZZY continuation violates typo attempt limits");
    }
    await this.assertRuntimeCompatible(true);
    const fuzzyPlan = await this.buildExpandedTypoPlan(request, primaryPlan);
    const contract = await this.materializeContract(
      request,
      fuzzyPlan,
      "FUZZY",
    );
    this.logMaterializedContract(contract, startedAt);
    return contract;
  }

  private async materializeContract(
    request: SearchRequestContext,
    plan: SearchQueryPlan | ExpandedFuzzySearchQueryPlan,
    mode: SearchExecutionMode,
  ): Promise<SearchCandidateContract> {
    const attempt: SearchAttemptContext = Object.freeze({ request, mode });
    const compiled = mode === "FUZZY"
      ? this.compiler.compileFuzzy(
          plan as ExpandedFuzzySearchQueryPlan,
          compilerContext(request),
        )
      : this.compiler.compilePrimary(plan, compilerContext(request));
    const membership = await this.materializePublishedMembership(
      request.storeId,
      compiled.membershipCandidateRelationSql,
    );
    return Object.freeze({
      request,
      attempt,
      plan,
      ...membership,
      rankedCandidateRelationSql: compiled.rankedCandidateRelationSql,
    });
  }

  private async buildExpandedTypoPlan(
    request: SearchRequestContext,
    primaryPlan: SearchQueryPlan,
  ): Promise<ExpandedFuzzySearchQueryPlan> {
    const alternativesByInputTerm = new Map<
      string,
      readonly VerifiedTypoAlternative[]
    >();
    const inputTerms = [...new Set(primaryPlan.requiredUnits.flatMap((unit) => {
      const clause = unit.originalTypoAlternative;
      return clause?.kind === "typoTerms" ? clause.terms : [];
    }))];
    const resolved = await Promise.all(inputTerms.map(async (inputTerm) => ({
      inputTerm,
      result: await this.resolveVerifiedTypoAlternatives(request, inputTerm),
    })));
    const totalCandidateWork = resolved.reduce(
      (total, item) => total + item.result.prefilterCount,
      0,
    );
    if (totalCandidateWork > POSTGRES_TYPO_MAX_CANDIDATE_WORK_PER_QUERY) {
      throw indexUnavailable("Typo candidate work exceeds request guardrails");
    }
    for (const item of resolved) {
      alternativesByInputTerm.set(item.inputTerm, item.result.alternatives);
    }

    const alternativesByUnit = new Map<
      number,
      readonly VerifiedTypoAlternative[]
    >();
    for (const unit of primaryPlan.requiredUnits) {
      const clause = unit.originalTypoAlternative;
      alternativesByUnit.set(
        unit.index,
        Object.freeze(clause?.kind === "typoTerms"
          ? clause.terms.flatMap(
              (term) => alternativesByInputTerm.get(term) ?? [],
            )
          : []),
      );
    }
    return this.planBuilder.buildExpandedFuzzy({
      primaryPlan,
      verifiedAlternativesByUnit: alternativesByUnit,
    });
  }

  private async resolveVerifiedTypoAlternatives(
    request: SearchRequestContext,
    inputTerm: string,
  ): Promise<{
    readonly alternatives: readonly VerifiedTypoAlternative[];
    readonly prefilterCount: number;
  }> {
    const compiled = this.typoCompiler.compileDistanceOneCandidates(inputTerm, {
      storeId: request.storeId,
      locale: request.locale,
    });
    const rows = await this.dependencies.connection().execute<TypoCandidateSqlRow>(
      compiled.candidateSql,
    );
    const values = rows as unknown as TypoCandidateSqlRow[];
    const summary = values[0];
    const prefilterCount = Number(summary?.prefilterCount ?? 0);
    const verifiedCount = Number(summary?.verifiedCount ?? 0);
    if (
      !Number.isSafeInteger(prefilterCount) ||
      !Number.isSafeInteger(verifiedCount) ||
      prefilterCount < 0 ||
      verifiedCount < 0 ||
      prefilterCount > POSTGRES_TYPO_MAX_PREFILTER_CANDIDATES_PER_TERM ||
      verifiedCount > POSTGRES_TYPO_MAX_VERIFIED_CANDIDATES_PER_TERM
    ) {
      throw indexUnavailable("Typo dictionary lookup exceeds candidate guardrails");
    }

    const alternatives: VerifiedTypoAlternative[] = [];
    for (const row of values) {
      if (row.term === null) continue;
      const editDistance = Number(row.editDistance);
      const trigramSimilarity = Number(row.trigramSimilarity);
      if (
        (editDistance !== 0 && editDistance !== 1) ||
        !Number.isFinite(trigramSimilarity) ||
        trigramSimilarity < 0 ||
        trigramSimilarity > 1
      ) {
        throw indexUnavailable("Typo dictionary returned invalid candidate metadata");
      }
      let normalized: SearchQueryNormalizationResult;
      try {
        normalized = this.normalizer.normalizeQuery({
          storeId: request.storeId,
          locale: request.locale,
          query: row.term,
        });
      } catch (error) {
        if (
          error instanceof SearchRuntimeError &&
          error.code === "SEARCH_NORMALIZATION_FAILED"
        ) {
          continue;
        }
        throw error;
      }
      if (
        normalized.lexicalizedQuery.normalizationContractVersion !==
          request.lexicalizedQuery.normalizationContractVersion ||
        normalized.lexicalizedQuery.profileRevision !==
          request.lexicalizedQuery.profileRevision
      ) {
        throw indexUnavailable("Typo alternative normalization profile mismatch");
      }
      alternatives.push(Object.freeze({
        inputTerm,
        vocabularyTerm: row.term,
        editDistance,
        trigramSimilarity,
        ftsLexemes: Object.freeze(
          normalized.lexicalizedQuery.originalUnits.flatMap(
            (unit) => unit.ftsLexemes,
          ),
        ),
      }));
    }
    return Object.freeze({
      alternatives: Object.freeze(alternatives),
      prefilterCount,
    });
  }

  private logMaterializedContract(
    contract: SearchCandidateContract,
    startedAt: number,
  ): void {
    const request = contract.request;
    getContext().kernel.getServices().logger.debug(
      {
        storeId: request.storeId,
        locale: request.locale,
        queryHash: request.normalizedQuery.hash,
        planFingerprint: contract.plan.fingerprint,
        mode: contract.attempt.mode,
        membershipCardinality: contract.membershipCardinality,
        membershipSerializedBytes: contract.membershipSerializedBytes,
        boostOnlyCandidateCount: contract.boostOnlyCandidateCount,
        matchedSynonymGroupCount: contract.plan.matchedSynonymGroupIds.length,
        applicableBoostCount: request.configuration.boosts.length,
        durationMs: Date.now() - startedAt,
      },
      "Canonical search candidates materialized",
    );
  }

  private async resolveRequestContext(
    input: SearchExecutionInput,
  ): Promise<SearchRequestContext> {
    const storeId = getContext().store.id;
    const normalized = this.normalizer.normalizeQuery({
      storeId,
      locale: input.locale,
      query: input.query,
    });
    const profile = normalized.lexicalizedQuery;
    const [settingsRow, synonyms, boostRows] = await Promise.all([
      this.dependencies.settings.find(),
      this.dependencies.configuration.loadSynonyms({
        storeId,
        locale: normalized.profile.locale,
        normalizationContractVersion: profile.normalizationContractVersion,
        normalizationProfileRevision: profile.profileRevision,
      }),
      this.dependencies.configuration.loadApplicableBoosts({
        storeId,
        locale: normalized.profile.locale,
        normalizedPhrase: normalized.normalizedQuery.lookupKey,
        normalizationContractVersion: profile.normalizationContractVersion,
        normalizationProfileRevision: profile.profileRevision,
      }),
    ]);

    const configuration: SearchRequestConfiguration = Object.freeze({
      settings: normalizeSettings(settingsRow, this.fields),
      synonyms,
      boosts: Object.freeze(boostRows.map((boost) => Object.freeze({
        boostId: boost.boostId,
        version: boost.version,
        productIds: boost.productIds,
      }))),
    });
    return Object.freeze({
      storeId,
      locale: normalized.profile.locale,
      normalizedQuery: normalized.normalizedQuery,
      lexicalizedQuery: normalized.lexicalizedQuery,
      configuration,
      diagnosticsMode: input.diagnosticsMode ?? "NONE",
    });
  }

  private async assertRuntimeCompatible(requireTypo: boolean): Promise<void> {
    const rows = await this.dependencies.connection().execute<
      PostgresSearchRuntimeObservation & Record<string, unknown>
    >(compilePostgresSearchRuntimeProbeSql());
    const observed = (rows as unknown as PostgresSearchRuntimeObservation[])[0];
    if (!observed) {
      throw indexUnavailable("PostgreSQL search runtime probe returned no rows");
    }
    if (!requireTypo) {
      assertPostgresSearchRuntimeCompatible(observed);
      return;
    }
    assertPostgresSearchRuntimeCompatible(observed);
    if (!observed.pgTrgmAvailable || !observed.fuzzystrmatchAvailable) {
      throw indexUnavailable("PostgreSQL typo extensions are unavailable");
    }
    const typoRows = await this.dependencies.connection().execute<
      Pick<PostgresSearchRuntimeObservation, "trigramSimilarityThreshold"> &
        Record<string, unknown>
    >(compilePostgresTypoRuntimeProbeSql());
    const typoObserved = (typoRows as unknown as Pick<
      PostgresSearchRuntimeObservation,
      "trigramSimilarityThreshold"
    >[])[0];
    assertPostgresSearchRuntimeCompatible(
      {
        ...observed,
        trigramSimilarityThreshold: Number(
          typoObserved?.trigramSimilarityThreshold,
        ),
      },
      { requireTypo: true },
    );
  }

  private async materializePublishedMembership(
    storeId: string,
    membershipCandidateRelationSql: SQL,
  ): Promise<Pick<
    SearchCandidateContract,
    "membershipBitmap" | "membershipCardinality" | "membershipSerializedBytes"
      | "boostOnlyCandidateCount"
  >> {
    const rows = await this.dependencies.connection().execute<SearchMembershipSqlRow>(sql`
      WITH
      membership_candidates AS MATERIALIZED (
        ${membershipCandidateRelationSql}
      ),
      published_candidates AS MATERIALIZED (
        SELECT
          ranked.product_doc_id,
          BOOL_OR(ranked.boost_only) AS boost_only
        FROM membership_candidates ranked
        JOIN listing.product_listing_index product
          ON product.store_id = ${storeId}::uuid
         AND product.store_id = ranked.store_id
         AND product.product_doc_id = ranked.product_doc_id
         AND product.product_id = ranked.product_id
        WHERE ranked.store_id = ${storeId}::uuid
          AND product.status = 'published'
        GROUP BY ranked.product_doc_id
      ),
      candidate_bitmap AS MATERIALIZED (
        SELECT COALESCE(
          rb_build_agg(candidate.product_doc_id),
          (
            SELECT rb_build_agg(empty_doc_id) - rb_build_agg(empty_doc_id)
            FROM (VALUES (0)) AS empty_bitmap_seed(empty_doc_id)
          )
        ) AS bitmap
        FROM published_candidates candidate
      )
      SELECT
        bitmap::text AS "membershipBitmap",
        rb_cardinality(bitmap)::int AS "membershipCardinality",
        octet_length(bitmap::text)::int AS "membershipSerializedBytes",
        (
          SELECT COUNT(*)::int
          FROM published_candidates
          WHERE boost_only = true
        ) AS "boostOnlyCandidateCount"
      FROM candidate_bitmap
    `);
    const row = (rows as unknown as SearchMembershipSqlRow[])[0];
    if (!row || typeof row.membershipBitmap !== "string") {
      throw indexUnavailable("Search membership materialization returned no bitmap");
    }
    const membershipCardinality = Number(row.membershipCardinality);
    const membershipSerializedBytes = Number(row.membershipSerializedBytes);
    const boostOnlyCandidateCount = Number(row.boostOnlyCandidateCount);
    if (
      !Number.isSafeInteger(membershipCardinality) ||
      membershipCardinality < 0 ||
      !Number.isSafeInteger(membershipSerializedBytes) ||
      membershipSerializedBytes <= 0 ||
      !Number.isSafeInteger(boostOnlyCandidateCount) ||
      boostOnlyCandidateCount < 0
    ) {
      throw indexUnavailable("Search membership bitmap metadata is invalid");
    }
    if (
      membershipSerializedBytes >
      SEARCH_MEMBERSHIP_BITMAP_MAX_SERIALIZED_BYTES
    ) {
      throw indexUnavailable("Search membership bitmap exceeds resource limits");
    }
    return Object.freeze({
      membershipBitmap: row.membershipBitmap,
      membershipCardinality,
      membershipSerializedBytes,
      boostOnlyCandidateCount,
    });
  }
}

function compilerContext(request: SearchRequestContext): PostgresFtsCompilerContext {
  return Object.freeze({
    storeId: request.storeId,
    locale: request.locale,
    normalizationContractVersion:
      request.lexicalizedQuery.normalizationContractVersion,
    normalizationProfileRevision: request.lexicalizedQuery.profileRevision,
    fieldWeights: request.configuration.settings.fieldWeights,
  });
}

function normalizeSettings(
  row: SearchSettings | null,
  fields: SearchFieldRegistry,
): SearchRequestSettings {
  if (!row) {
    throw indexUnavailable("Search settings are unavailable for the current store");
  }
  if (!Array.isArray(row.enabledFields)) {
    throw indexUnavailable("Search settings enabled fields are invalid");
  }
  const enabledFields = fields.normalizeEnabledFields(
    row.enabledFields as SearchTextField[],
  );
  if (!row.fieldWeights || typeof row.fieldWeights !== "object") {
    throw indexUnavailable("Search settings field weights are invalid");
  }
  const rawWeights = row.fieldWeights as Partial<Record<SearchTextField, unknown>>;
  const fieldWeights: Partial<Record<SearchTextField, number>> = {};
  for (const field of enabledFields) {
    const weight = rawWeights[field];
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
      throw indexUnavailable(`Invalid runtime weight for search field: ${field}`);
    }
    fieldWeights[field] = weight;
  }
  if (
    row.outOfStockPolicy !== "SHOW" &&
    row.outOfStockPolicy !== "HIDE" &&
    row.outOfStockPolicy !== "PLACE_LAST"
  ) {
    throw indexUnavailable("Search settings out-of-stock policy is invalid");
  }
  return Object.freeze({
    version: row.version,
    enabledFields,
    fieldWeights: Object.freeze(fieldWeights),
    typoToleranceEnabled: row.typoToleranceEnabled,
    outOfStockPolicy: row.outOfStockPolicy,
  });
}

function canRunTypoAttempt(request: SearchRequestContext): boolean {
  if (request.normalizedQuery.codePointLength < 4) return false;
  const typoTerms = request.lexicalizedQuery.originalUnits.flatMap(
    (unit) => unit.typoTerms,
  );
  return typoTerms.length > 0 &&
    typoTerms.length <= 8 &&
    typoTerms.every((term) => {
      const length = [...term].length;
      return length >= 4 && length <= 64;
    });
}
