import type {
  SearchOutOfStockPolicy,
  SearchTextField,
} from "../../repositories/search/searchRepositoryTypes.js";
import { indexUnavailable } from "../errors.js";
import { SEARCH_NORMALIZATION_LIMITS } from "../normalization/limits.js";
import type { SearchTokenKind } from "../normalization/types.js";
import type {
  ExpandedFuzzySearchQueryPlan,
  SearchClause,
  SearchQueryPlan,
  SearchRequiredUnit,
  VerifiedTypoAlternative,
} from "../planner/types.js";
import type {
  PostgresFtsFuzzyClauseDescription,
  PostgresFtsFuzzyExecutionDescription,
} from "./PostgresFtsQueryCompiler.js";
import { POSTGRES_TYPO_MAX_VERIFIED_CANDIDATES_PER_TERM } from "./PostgresTypoQueryCompiler.js";
import type {
  SearchCandidateContract,
  SearchExecutionMode,
} from "./SearchExecutionService.js";

export interface SearchExplainInput {
  readonly query: string;
  readonly locale: string;
}

export type SearchExplainLexicalUnitKind =
  | "TEXT"
  | "NUMBER"
  | "CODE"
  | "FOREIGN"
  | "MIXED_SCRIPT"
  | "STOPWORD";

export type SearchExplainClauseKind =
  | "FTS_TERMS"
  | "FTS_PHRASE"
  | "SYNONYM"
  | "IDENTIFIER_EXACT"
  | "IDENTIFIER_PREFIX";

export type SearchExplainReason =
  | "STOPWORD_REMOVAL"
  | "SYNONYM_EXPANSION"
  | "IDENTIFIER_EXPANSION"
  | "PRODUCT_BOOST"
  | "BOOST_ONLY_CANDIDATE"
  | "FUZZY_FALLBACK"
  | "TYPO_EXPANSION";

export interface SearchExplainClause {
  readonly kind: SearchExplainClauseKind;
  readonly value: string | null;
  readonly lexemes: readonly string[];
  readonly fields: readonly SearchTextField[];
  readonly synonymGroupId: string | null;
  readonly requireSameElement: boolean;
  readonly alternatives: readonly SearchExplainClause[];
}

export interface SearchExplainTypoAlternative {
  readonly value: string;
  readonly lexemes: readonly string[];
  readonly editDistance: number;
  readonly trigramSimilarity: number;
}

export interface SearchExplainUnit {
  readonly source: string;
  readonly normalized: string;
  readonly kind: SearchExplainLexicalUnitKind;
  readonly removedAsStopword: boolean;
  readonly lexemes: readonly string[];
  readonly planUnitIndex: number | null;
  readonly clauses: readonly SearchExplainClause[];
  readonly typoAlternatives: readonly SearchExplainTypoAlternative[];
}

export interface SearchExplainFieldWeight {
  readonly field: SearchTextField;
  readonly weight: number;
}

export interface SearchExplainSettings {
  readonly version: number;
  readonly enabledFields: readonly SearchTextField[];
  readonly fieldWeights: readonly SearchExplainFieldWeight[];
  readonly typoToleranceEnabled: boolean;
  readonly outOfStockPolicy: SearchOutOfStockPolicy;
}

export interface SearchExplain {
  readonly mode: SearchExecutionMode;
  readonly originalQuery: string;
  readonly normalizedQuery: string;
  readonly locale: string;
  readonly normalizationContractVersion: string;
  readonly normalizationProfileRevision: string;
  readonly units: readonly SearchExplainUnit[];
  readonly wholeQueryClauses: readonly SearchExplainClause[];
  readonly settings: SearchExplainSettings;
  readonly matchedSynonymGroupIds: readonly string[];
  readonly applicableProductBoostIds: readonly string[];
  readonly candidateCount: number;
  readonly boostOnlyCandidateCount: number;
  readonly membershipSerializedBytes: number;
  readonly planFingerprint: string;
  readonly reasons: readonly SearchExplainReason[];
}

export function createSearchExplain(
  originalQuery: string,
  contract: SearchCandidateContract,
  fuzzyExecution: PostgresFtsFuzzyExecutionDescription | null,
): SearchExplain {
  assertExplainPlanLimits(contract.plan);
  if (contract.attempt.mode === "FUZZY" && !fuzzyExecution) {
    throw indexUnavailable("FUZZY search explain requires compiler execution metadata");
  }

  const requiredUnitsBySourceIndex = new Map<number, SearchRequiredUnit>();
  for (const unit of contract.plan.requiredUnits) {
    for (const sourceIndex of unit.sourceUnitIndexes) {
      requiredUnitsBySourceIndex.set(sourceIndex, unit);
    }
  }
  const fuzzyAlternatives = verifiedAlternatives(contract.plan);
  const primaryMode = contract.attempt.mode === "PRIMARY";
  const fuzzyUnits = new Map(
    (fuzzyExecution?.units ?? []).map((unit) => [unit.unitIndex, unit]),
  );
  const mappedPlanUnits = new Set<number>();
  const units = contract.request.lexicalizedQuery.tokens.map((token) => {
    const planUnit = requiredUnitsBySourceIndex.get(token.sourceIndex) ?? null;
    const isFirstTokenForPlanUnit = planUnit !== null &&
      !mappedPlanUnits.has(planUnit.index);
    if (planUnit) mappedPlanUnits.add(planUnit.index);
    const typoTerms = new Set(token.typoTerms);
    const typoAlternatives = planUnit
      ? (fuzzyAlternatives.get(planUnit.index) ?? [])
        .filter((alternative) => typoTerms.has(alternative.inputTerm))
        .map(mapTypoAlternative)
      : [];

    return Object.freeze({
      source: token.sourceText,
      normalized: token.normalizedText,
      kind: mapLexicalUnitKind(token.kind, token.normalizedText),
      removedAsStopword: token.removed,
      lexemes: freezeArray(token.ftsLexemes),
      planUnitIndex: planUnit?.index ?? null,
      clauses: !isFirstTokenForPlanUnit
        ? Object.freeze([])
        : primaryMode
          ? freezeArray([
              ...planUnit.primaryAlternatives.map(mapClause),
              ...planUnit.originalIdentifierAlternatives.map(mapClause),
            ])
          : freezeArray(
              (fuzzyUnits.get(planUnit.index)?.clauses ?? []).map(
                mapFuzzyClause,
              ),
            ),
      typoAlternatives: freezeArray(typoAlternatives),
    });
  });
  const settings = contract.request.configuration.settings;
  const reasons = collectReasons(contract, units, fuzzyExecution);

  return Object.freeze({
    mode: contract.attempt.mode,
    originalQuery,
    normalizedQuery: contract.request.normalizedQuery.lookupKey,
    locale: contract.request.locale,
    normalizationContractVersion:
      contract.request.lexicalizedQuery.normalizationContractVersion,
    normalizationProfileRevision:
      contract.request.lexicalizedQuery.profileRevision,
    units: freezeArray(units),
    wholeQueryClauses: primaryMode
      ? freezeArray(
          contract.plan.wholeQueryIdentifierAlternatives.map(mapClause),
        )
      : Object.freeze([]),
    settings: Object.freeze({
      version: settings.version,
      enabledFields: freezeArray(settings.enabledFields),
      fieldWeights: freezeArray(settings.enabledFields.map((field) =>
        Object.freeze({ field, weight: settings.fieldWeights[field]! })
      )),
      typoToleranceEnabled: settings.typoToleranceEnabled,
      outOfStockPolicy: settings.outOfStockPolicy,
    }),
    matchedSynonymGroupIds: freezeArray(contract.plan.matchedSynonymGroupIds),
    applicableProductBoostIds: freezeArray(
      contract.request.configuration.boosts.map((boost) => boost.boostId),
    ),
    candidateCount: contract.membershipCardinality,
    boostOnlyCandidateCount: contract.boostOnlyCandidateCount,
    membershipSerializedBytes: contract.membershipSerializedBytes,
    planFingerprint: contract.plan.fingerprint,
    reasons,
  });
}

function mapClause(clause: SearchClause): SearchExplainClause {
  switch (clause.kind) {
    case "ftsTerms":
    case "ftsPhrase":
      return Object.freeze({
        kind: clause.kind === "ftsTerms" ? "FTS_TERMS" : "FTS_PHRASE",
        value: clause.text,
        lexemes: freezeArray(clause.lexemes),
        fields: freezeArray(clause.fields),
        synonymGroupId: null,
        requireSameElement: clause.kind === "ftsPhrase",
        alternatives: Object.freeze([]),
      });
    case "synonym":
      return Object.freeze({
        kind: "SYNONYM",
        value: null,
        lexemes: Object.freeze([]),
        fields: Object.freeze([]),
        synonymGroupId: clause.groupId,
        requireSameElement: false,
        alternatives: freezeArray(clause.alternatives.map(mapClause)),
      });
    case "identifierExact":
    case "identifierPrefix":
      return Object.freeze({
        kind: clause.kind === "identifierExact"
          ? "IDENTIFIER_EXACT"
          : "IDENTIFIER_PREFIX",
        value: clause.value,
        lexemes: Object.freeze([]),
        fields: Object.freeze([]),
        synonymGroupId: null,
        requireSameElement: false,
        alternatives: Object.freeze([]),
      });
    case "typoTerms":
      throw indexUnavailable(
        "Unverified typo source clauses cannot be exposed as executed clauses",
      );
  }
}

function mapTypoAlternative(
  alternative: VerifiedTypoAlternative,
): SearchExplainTypoAlternative {
  return Object.freeze({
    value: alternative.vocabularyTerm,
    lexemes: freezeArray(alternative.ftsLexemes),
    editDistance: alternative.editDistance,
    trigramSimilarity: alternative.trigramSimilarity,
  });
}

function mapFuzzyClause(
  clause: PostgresFtsFuzzyClauseDescription,
): SearchExplainClause {
  return Object.freeze({
    kind: "FTS_TERMS",
    value: clause.lexemes.join(" "),
    lexemes: freezeArray(clause.lexemes),
    fields: freezeArray(clause.fields),
    synonymGroupId: null,
    requireSameElement: clause.requireSameElement,
    alternatives: Object.freeze([]),
  });
}

function mapLexicalUnitKind(
  kind: SearchTokenKind,
  normalized: string,
): SearchExplainLexicalUnitKind {
  switch (kind) {
    case "language":
      return "TEXT";
    case "code":
      return /^\p{Number}+$/u.test(normalized) ? "NUMBER" : "CODE";
    case "foreign":
      return "FOREIGN";
    case "mixed_script":
      return "MIXED_SCRIPT";
    case "stopword":
      return "STOPWORD";
  }
}

function verifiedAlternatives(
  plan: SearchQueryPlan | ExpandedFuzzySearchQueryPlan,
): ReadonlyMap<number, readonly VerifiedTypoAlternative[]> {
  return "verifiedAlternativesByUnit" in plan
    ? plan.verifiedAlternativesByUnit
    : new Map();
}

function collectReasons(
  contract: SearchCandidateContract,
  units: readonly SearchExplainUnit[],
  fuzzyExecution: PostgresFtsFuzzyExecutionDescription | null,
): readonly SearchExplainReason[] {
  const reasons: SearchExplainReason[] = [];
  if (units.some((unit) => unit.removedAsStopword)) {
    reasons.push("STOPWORD_REMOVAL");
  }
  if (
    contract.attempt.mode === "PRIMARY" &&
    contract.plan.matchedSynonymGroupIds.length > 0
  ) {
    reasons.push("SYNONYM_EXPANSION");
  }
  if (
    contract.attempt.mode === "PRIMARY" &&
    (
      contract.plan.wholeQueryIdentifierAlternatives.length > 0 ||
      contract.plan.requiredUnits.some(
        (unit) => unit.originalIdentifierAlternatives.length > 0,
      )
    )
  ) {
    reasons.push("IDENTIFIER_EXPANSION");
  }
  if (contract.request.configuration.boosts.length > 0) {
    reasons.push("PRODUCT_BOOST");
  }
  if (contract.boostOnlyCandidateCount > 0) {
    reasons.push("BOOST_ONLY_CANDIDATE");
  }
  if (contract.attempt.mode === "FUZZY") {
    reasons.push("FUZZY_FALLBACK");
  }
  if (fuzzyExecution?.executed) {
    reasons.push("TYPO_EXPANSION");
  }
  return freezeArray(reasons);
}

function assertExplainPlanLimits(
  plan: SearchQueryPlan | ExpandedFuzzySearchQueryPlan,
): void {
  if (plan.requiredUnits.length > SEARCH_NORMALIZATION_LIMITS.queryUnits) {
    throw indexUnavailable("Search explain unit limit was exceeded");
  }
  const clauseCount = plan.requiredUnits.reduce(
    (total, unit) => total +
      unit.primaryAlternatives.reduce(
        (subtotal, clause) => subtotal + countClause(clause),
        0,
      ) +
      unit.originalIdentifierAlternatives.length +
      (unit.originalTypoAlternative ? 1 : 0),
    0,
  );
  if (clauseCount > SEARCH_NORMALIZATION_LIMITS.plannerClauses) {
    throw indexUnavailable("Search explain clause limit was exceeded");
  }
  const typoAlternativesByUnit = verifiedAlternatives(plan);
  let totalTypoAlternatives = 0;
  for (const alternatives of typoAlternativesByUnit.values()) {
    if (
      alternatives.length >
        POSTGRES_TYPO_MAX_VERIFIED_CANDIDATES_PER_TERM *
          SEARCH_NORMALIZATION_LIMITS.queryUnits
    ) {
      throw indexUnavailable("Search explain typo alternative limit was exceeded");
    }
    totalTypoAlternatives += alternatives.length;
  }
  if (
    totalTypoAlternatives >
      POSTGRES_TYPO_MAX_VERIFIED_CANDIDATES_PER_TERM *
        SEARCH_NORMALIZATION_LIMITS.queryUnits
  ) {
    throw indexUnavailable("Search explain typo alternative limit was exceeded");
  }
}

function countClause(clause: SearchClause): number {
  return clause.kind === "synonym"
    ? 1 + clause.alternatives.reduce(
      (total, alternative) => total + countClause(alternative),
      0,
    )
    : 1;
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}
