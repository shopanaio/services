import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import {
  buildRecommendation,
  type RecommendationBuildResult,
  type RecommendationExcludedReason,
} from "../../recommendation/buildRecommendation.js";
import { canonicalByteLength } from "../../recommendation/canonical.js";
import {
  MAX_RECOMMENDATION_PREVIEW_BYTES,
  MAX_RECOMMENDATION_PREVIEW_CHANGES,
  MAX_MANUAL_ROWS_PER_ANCHOR_PLACEMENT,
  recommendationModelVersion,
} from "../../recommendation/constants.js";
import type {
  ManualProductRecommendation,
  RecommendationPlacement,
  RecommendationPlacementPolicy,
  RecommendationSnapshotItem,
  RecommendationStrategy,
} from "../../repositories/models/recommendationRuntime.js";
import type { RankedRecommendationCandidate } from "../../repositories/recommendation/types.js";
import { validateManualValues, validatePolicy } from "./validation.js";
import { RecommendationIntegrityError } from "../../recommendation/errors.js";

interface PolicyDraft {
  expectedVersion?: number | null;
  enabled: boolean;
  strategy: RecommendationStrategy;
  minimumResults: number;
  maximumResults: number;
  fallbackChain: string[];
}

export type ManualDraftChange =
  | { kind: "create"; value: Omit<ManualDraftRow, "id" | "expectedVersion"> }
  | {
      kind: "update";
      value: Partial<Omit<ManualDraftRow, "id" | "expectedVersion">> & {
        id: string;
        expectedVersion: number;
      };
    }
  | { kind: "delete"; value: { id: string; expectedVersion: number } };

export interface ManualDraftRow {
  id: string;
  expectedVersion: number;
  targetProductId: string;
  action: "PIN" | "BOOST" | "EXCLUDE";
  position: number | null;
  boost: string | null;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface RecommendationSnapshotPreviewParams {
  anchorProductId: string;
  placement: RecommendationPlacement;
  policy?: PolicyDraft | null;
  manualChanges: ManualDraftChange[];
}

export interface RecommendationPreviewResultValue {
  candidates: Array<
    Pick<
      RankedRecommendationCandidate,
      "targetProductId" | "rank" | "score" | "primarySource" | "sourceBreakdown"
    >
  >;
  excluded: Array<{ targetProductId: string; reason: RecommendationExcludedReason }>;
  asOf: string;
  modelVersion: string;
}

export interface RecommendationSnapshotPreviewResult {
  active: RecommendationPreviewResultValue | null;
  draft: RecommendationPreviewResultValue | null;
  userErrors: UserError[];
}

export class RecommendationSnapshotPreviewScript extends BaseScript<
  RecommendationSnapshotPreviewParams,
  RecommendationSnapshotPreviewResult
> {
  @Transactional()
  protected async execute(
    input: RecommendationSnapshotPreviewParams,
  ): Promise<RecommendationSnapshotPreviewResult> {
    if (
      input.manualChanges.length > MAX_RECOMMENDATION_PREVIEW_CHANGES ||
      canonicalByteLength(input) > MAX_RECOMMENDATION_PREVIEW_BYTES
    ) {
      return {
        active: null,
        draft: null,
        userErrors: [{ message: "Preview input limit exceeded", code: "PREVIEW_LIMIT_EXCEEDED" }],
      };
    }
    const referencedProductIds = [
      input.anchorProductId,
      ...input.manualChanges.flatMap((change) => {
        if (change.kind === "create") return [change.value.targetProductId];
        if (change.kind === "update" && typeof change.value.targetProductId === "string") {
          return [change.value.targetProductId];
        }
        return [];
      }),
    ];
    const ownedProductIds =
      await this.repository.manualProductRecommendation.findOwnedProductIds(referencedProductIds);
    if (referencedProductIds.some((id) => !ownedProductIds.has(id))) {
      return {
        active: null,
        draft: null,
        userErrors: [{ message: "Product not found", code: "NOT_FOUND" }],
      };
    }
    const asOf = await this.repository.recommendationCalculationRun.databaseNow();
    const persistedPolicy = await this.repository.recommendationPlacementPolicy.findByPlacement(
      input.placement,
    );
    const active = await this.activeResult(input.anchorProductId, input.placement);
    const policyResult = this.resolvePolicy(input, persistedPolicy, asOf);
    if (policyResult.userErrors.length > 0)
      return { active, draft: null, userErrors: policyResult.userErrors };
    if (!policyResult.policy) return { active, draft: null, userErrors: [] };
    const rows = await this.loadAllManual(input.anchorProductId, input.placement);
    const overlay = this.applyOverlay(input, rows, policyResult.policy.maximumResults, asOf);
    if (overlay.userErrors.length > 0)
      return { active, draft: null, userErrors: overlay.userErrors };
    if (overlay.rows.length > MAX_MANUAL_ROWS_PER_ANCHOR_PLACEMENT) {
      return {
        active,
        draft: null,
        userErrors: [
          {
            message: "Manual recommendation row limit reached",
            code: "MANUAL_ROW_LIMIT_EXCEEDED",
          },
        ],
      };
    }
    const asOfTime = Date.parse(asOf);
    if (
      overlay.rows.some(
        (row) =>
          row.action === "PIN" &&
          row.enabled &&
          row.anchorReferenceStatus === "VALID" &&
          row.targetReferenceStatus === "VALID" &&
          (row.position ?? 0) > policyResult.policy!.maximumResults &&
          (row.endsAt === null || Date.parse(row.endsAt) > asOfTime),
      )
    ) {
      return {
        active,
        draft: null,
        userErrors: [
          {
            message: "A current or future PIN exceeds maximumResults",
            code: "PIN_POSITION_OUT_OF_RANGE",
          },
        ],
      };
    }
    const scheduleErrors = validateOverlaySchedules(overlay.rows);
    if (scheduleErrors.length > 0) {
      return { active, draft: null, userErrors: scheduleErrors };
    }
    const insufficientSupport: Array<{ targetProductId: string }> = [];
    let build: RecommendationBuildResult;
    try {
      build = await buildRecommendation({
        anchorProductId: input.anchorProductId,
        policy: policyResult.policy,
        manualRows: overlay.rows.filter((row) => effective(row, asOf)),
        loadFbt: async (limit) => {
          const rows = await this.repository.recommendationCandidateSource.fbt({
            anchorProductId: input.anchorProductId,
            limit,
            diagnostic: true,
          });
          insufficientSupport.push(...rows.filter((candidate) => candidate.insufficientSupport));
          return rows.filter((candidate) => !candidate.insufficientSupport);
        },
        loadCategoryPopularity: (limit) =>
          this.repository.recommendationCandidateSource.categoryPopularity({
            anchorProductId: input.anchorProductId,
            limit,
          }),
        loadStorePopularity: (limit) =>
          this.repository.recommendationCandidateSource.storePopularity({
            anchorProductId: input.anchorProductId,
            limit,
          }),
        eligibility: (ids) => this.repository.recommendationCandidateSource.currentEligibility(ids),
      });
    } catch (error) {
      if (
        error instanceof RecommendationIntegrityError &&
        error.code === "CANDIDATE_LIMIT_EXCEEDED"
      ) {
        return {
          active,
          draft: null,
          userErrors: [
            {
              message: "Preview candidate limit exceeded",
              code: "PREVIEW_LIMIT_EXCEEDED",
            },
          ],
        };
      }
      throw error;
    }
    const represented = new Set([
      ...build.candidates.map((candidate) => candidate.targetProductId),
      ...build.excluded.map((candidate) => candidate.targetProductId),
    ]);
    const diagnosticIds = insufficientSupport
      .map((candidate) => candidate.targetProductId)
      .filter((targetProductId) => !represented.has(targetProductId));
    const diagnosticEligibility =
      await this.repository.recommendationCandidateSource.currentEligibility(diagnosticIds);
    const manualExclusions = new Set(
      overlay.rows
        .filter((row) => effective(row, asOf) && row.action === "EXCLUDE")
        .map((row) => row.targetProductId),
    );
    const diagnosticExcluded = diagnosticIds.map((targetProductId) => {
      const state = diagnosticEligibility.get(targetProductId) ?? "STALE";
      const reason: RecommendationExcludedReason = manualExclusions.has(targetProductId)
        ? "EXCLUDED"
        : state === "ELIGIBLE"
          ? "INSUFFICIENT_SUPPORT"
          : state;
      return { targetProductId, reason };
    });
    return {
      active,
      draft: {
        candidates: build.candidates,
        excluded: [...build.excluded, ...diagnosticExcluded],
        asOf,
        modelVersion: recommendationModelVersion(input.placement),
      },
      userErrors: [],
    };
  }

  private resolvePolicy(
    input: RecommendationSnapshotPreviewParams,
    persisted: RecommendationPlacementPolicy | null,
    asOf: string,
  ): { policy: RecommendationPlacementPolicy | null; userErrors: UserError[] } {
    if (!input.policy) return { policy: persisted, userErrors: [] };
    if (
      (persisted && input.policy.expectedVersion !== persisted.version) ||
      (!persisted && input.policy.expectedVersion != null)
    ) {
      return {
        policy: null,
        userErrors: [{ message: "Policy version changed", code: "VERSION_CONFLICT" }],
      };
    }
    const userErrors = validatePolicy({ placement: input.placement, ...input.policy });
    return {
      policy:
        userErrors.length > 0
          ? null
          : {
              policyId: persisted?.policyId ?? "00000000-0000-7000-8000-000000000000",
              storeId: this.context.store.id,
              placement: input.placement,
              enabled: input.policy.enabled,
              strategy: input.policy.strategy,
              minimumResults: input.policy.minimumResults,
              maximumResults: input.policy.maximumResults,
              fallbackChain: input.policy.fallbackChain,
              version: persisted?.version ?? 0,
              createdAt: persisted?.createdAt ?? asOf,
              updatedAt: asOf,
            },
      userErrors,
    };
  }

  private async loadAllManual(anchorProductId: string, placement: RecommendationPlacement) {
    const rows: ManualProductRecommendation[] = [];
    let afterId: string | undefined;
    do {
      const page = await this.repository.manualProductRecommendation.listPage({
        anchorProductId,
        placement,
        afterId,
        first: 500,
      });
      rows.push(...page.rows);
      afterId = page.nextCursor ?? undefined;
    } while (afterId);
    return rows;
  }

  private applyOverlay(
    input: RecommendationSnapshotPreviewParams,
    persistedRows: ManualProductRecommendation[],
    maximumResults: number,
    asOf: string,
  ): { rows: ManualProductRecommendation[]; userErrors: UserError[] } {
    const rows = new Map(persistedRows.map((row) => [row.recommendationId, row]));
    const touched = new Set<string>();
    const userErrors: UserError[] = [];
    for (const [index, change] of input.manualChanges.entries()) {
      if (change.kind === "create") {
        const row = draftRow(input, change.value, `preview-create-${index}`, 0, asOf);
        userErrors.push(...validateManualValues({ ...row, maximumResults }));
        rows.set(row.recommendationId, row);
        continue;
      }
      const id = change.value.id;
      if (touched.has(id)) {
        userErrors.push({
          message: "Duplicate draft change",
          field: ["input", "manualChanges", String(index)],
          code: "DUPLICATE_DRAFT_CHANGE",
        });
        continue;
      }
      touched.add(id);
      const current = rows.get(id);
      if (!current) {
        userErrors.push({ message: "Manual recommendation not found", code: "NOT_FOUND" });
        continue;
      }
      if (current.version !== change.value.expectedVersion) {
        userErrors.push({
          message: "Manual recommendation version changed",
          code: "VERSION_CONFLICT",
        });
        continue;
      }
      if (change.kind === "delete") {
        rows.delete(id);
        continue;
      }
      const next = { ...current, ...change.value, recommendationId: id, version: current.version };
      userErrors.push(...validateManualValues({ ...next, maximumResults }));
      rows.set(id, next);
    }
    return { rows: [...rows.values()], userErrors };
  }

  private async activeResult(
    anchorProductId: string,
    placement: RecommendationPlacement,
  ): Promise<RecommendationPreviewResultValue | null> {
    const snapshot = await this.repository.recommendationSnapshot.findActive(
      anchorProductId,
      placement,
    );
    if (!snapshot) return null;
    const items = await this.repository.recommendationSnapshot.listItems(snapshot.snapshotId);
    const eligibility = await this.repository.recommendationCandidateSource.currentEligibility(
      items.map((item) => item.targetProductId),
    );
    const candidates: RecommendationPreviewResultValue["candidates"] = [];
    const excluded: RecommendationPreviewResultValue["excluded"] = [];
    for (const item of items) {
      const state = eligibility.get(item.targetProductId) ?? "STALE";
      if (state !== "ELIGIBLE") {
        excluded.push({ targetProductId: item.targetProductId, reason: state });
      } else {
        candidates.push(toPreviewCandidate(item));
      }
    }
    return {
      candidates,
      excluded,
      asOf: snapshot.generatedAt,
      modelVersion: snapshot.modelVersion,
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

function draftRow(
  input: RecommendationSnapshotPreviewParams,
  value: Omit<ManualDraftRow, "id" | "expectedVersion">,
  id: string,
  version: number,
  asOf: string,
): ManualProductRecommendation {
  return {
    recommendationId: id,
    storeId: "00000000-0000-7000-8000-000000000000",
    anchorProductId: input.anchorProductId,
    targetProductId: value.targetProductId,
    placement: input.placement,
    action: value.action,
    position: value.position,
    boost: value.boost,
    enabled: value.enabled,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    anchorReferenceStatus: "VALID",
    targetReferenceStatus: "VALID",
    version,
    createdAt: asOf,
    updatedAt: asOf,
  };
}

function effective(row: ManualProductRecommendation, asOf: string): boolean {
  const value = Date.parse(asOf);
  return (
    row.enabled &&
    row.anchorReferenceStatus === "VALID" &&
    row.targetReferenceStatus === "VALID" &&
    (row.startsAt === null || Date.parse(row.startsAt) <= value) &&
    (row.endsAt === null || value < Date.parse(row.endsAt))
  );
}

function toPreviewCandidate(item: RecommendationSnapshotItem) {
  return {
    targetProductId: item.targetProductId,
    rank: item.rank,
    score: item.score,
    primarySource: item.primarySource,
    sourceBreakdown: item.sourceBreakdown,
  };
}

function validateOverlaySchedules(rows: readonly ManualProductRecommendation[]): UserError[] {
  const reserving = rows.filter(
    (row) =>
      row.enabled && row.anchorReferenceStatus === "VALID" && row.targetReferenceStatus === "VALID",
  );
  const groups = new Map<string, ManualProductRecommendation[]>();
  for (const row of reserving) {
    const targetKey = `target:${row.targetProductId}`;
    groups.set(targetKey, [...(groups.get(targetKey) ?? []), row]);
    if (row.action === "PIN" && row.position !== null) {
      const pinKey = `pin:${row.position}`;
      groups.set(pinKey, [...(groups.get(pinKey) ?? []), row]);
    }
  }
  for (const group of groups.values()) {
    const ordered = [...group].sort(
      (left, right) =>
        intervalStart(left) - intervalStart(right) ||
        left.recommendationId.localeCompare(right.recommendationId),
    );
    let previousEnd = Number.NEGATIVE_INFINITY;
    for (const row of ordered) {
      const start = intervalStart(row);
      if (start < previousEnd) {
        return [
          {
            message: "Manual recommendation schedule conflicts with another row",
            code: "SCHEDULE_CONFLICT",
          },
        ];
      }
      previousEnd = Math.max(previousEnd, intervalEnd(row));
    }
  }
  return [];
}

function intervalStart(row: ManualProductRecommendation): number {
  return row.startsAt === null ? Number.NEGATIVE_INFINITY : Date.parse(row.startsAt);
}

function intervalEnd(row: ManualProductRecommendation): number {
  return row.endsAt === null ? Number.POSITIVE_INFINITY : Date.parse(row.endsAt);
}
