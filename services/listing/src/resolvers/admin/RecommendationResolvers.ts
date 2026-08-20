import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { hashContent } from "@shopana/shared-kernel";
import { GraphQLError } from "graphql";
import type {
  ManualProductRecommendation,
  RecommendationPlacement,
  RecommendationPlacementPolicy,
} from "../../repositories/models/recommendationRuntime.js";
import type {
  ManualRecommendationResult,
  RecommendationPolicyResult,
} from "../../scripts/recommendation/dto/index.js";
import {
  RecommendationSnapshotPreviewScript,
  type RecommendationSnapshotPreviewParams,
  type RecommendationSnapshotPreviewResult,
} from "../../scripts/recommendation/RecommendationSnapshotPreviewScript.js";
import type { RecommendationWorkflowContext } from "../../workflows/RecommendationWorkflows.js";
import { ListingType } from "./ListingType.js";
import { toListingNodeReference } from "./listingReferences.js";

export function mapRecommendationPolicy(row: RecommendationPlacementPolicy) {
  return {
    id: encodeGlobalIdByType(row.policyId, GlobalIdEntity.RecommendationPlacementPolicy),
    placement: row.placement,
    enabled: row.enabled,
    strategy: row.strategy,
    minimumResults: row.minimumResults,
    maximumResults: row.maximumResults,
    fallbackChain: row.fallbackChain,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    __typename: "RecommendationPlacementPolicy",
  };
}

export function mapManualRecommendation(row: ManualProductRecommendation) {
  return {
    id: encodeGlobalIdByType(row.recommendationId, GlobalIdEntity.ManualProductRecommendation),
    anchorProduct: toListingNodeReference(row.anchorProductId),
    targetProduct: toListingNodeReference(row.targetProductId),
    placement: row.placement,
    action: row.action,
    position: row.position,
    boost: row.boost,
    enabled: row.enabled,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    anchorReferenceStatus: row.anchorReferenceStatus,
    targetReferenceStatus: row.targetReferenceStatus,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    __typename: "ManualProductRecommendation",
  };
}

export class RecommendationQueryResolver extends ListingType<Record<string, never>> {
  async policy(args: { placement: RecommendationPlacement }) {
    const row = await this.$ctx.kernel.repository.recommendationPlacementPolicy.findByPlacement(
      args.placement,
    );
    return row ? mapRecommendationPolicy(row) : null;
  }

  async policies() {
    const rows = await this.$ctx.kernel.repository.recommendationPlacementPolicy.list();
    return rows.map(mapRecommendationPolicy);
  }

  async manualConnection(args: {
    anchorProductId: string;
    placement: RecommendationPlacement;
    first?: number | null;
    after?: string | null;
  }) {
    const anchorProductId = decodeGlobalIdByType(args.anchorProductId, GlobalIdEntity.Product);
    const first = args.first ?? 50;
    if (!Number.isSafeInteger(first) || first < 1 || first > 100) {
      throw new Error("first must be an integer from 1 to 100");
    }
    const afterId = args.after ? Buffer.from(args.after, "base64url").toString("utf8") : undefined;
    if (
      afterId !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(afterId)
    ) {
      throw new GraphQLError("Invalid manual recommendation cursor", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    const page = await this.$ctx.kernel.repository.manualProductRecommendation.listPage({
      anchorProductId,
      placement: args.placement,
      afterId,
      first,
    });
    const nodes = page.rows.map(mapManualRecommendation);
    const cursors = page.rows.map((row) => Buffer.from(row.recommendationId).toString("base64url"));
    return {
      nodes,
      edges: nodes.map((node, index) => ({ node, cursor: cursors[index]! })),
      pageInfo: {
        hasNextPage: page.nextCursor !== null,
        hasPreviousPage: false,
        startCursor: cursors[0] ?? null,
        endCursor: cursors.at(-1) ?? null,
      },
    };
  }

  async preview(args: {
    input: {
      anchorProductId: string;
      placement: RecommendationPlacement;
      policy?: RecommendationSnapshotPreviewParams["policy"] | null;
      manualChanges: Array<{
        create?: (Record<string, unknown> & { targetProductId: string }) | null;
        update?: (Record<string, unknown> & { id: string; targetProductId?: string | null }) | null;
        delete?: { id: string; expectedVersion: number } | null;
      }>;
    };
  }) {
    const userErrors: Array<{ message: string; field?: string[]; code?: string }> = [];
    const changes: RecommendationSnapshotPreviewParams["manualChanges"] = [];
    for (const [index, change] of args.input.manualChanges.entries()) {
      const operations = [change.create, change.update, change.delete].filter(
        (value) => value != null,
      );
      if (operations.length !== 1) {
        userErrors.push({
          message: "Draft change must contain exactly one operation",
          field: ["input", "manualChanges", String(index)],
          code: "INVALID_DRAFT_CHANGE",
        });
        continue;
      }
      if (change.create) {
        changes.push({
          kind: "create",
          value: {
            targetProductId: decodeGlobalIdByType(
              change.create.targetProductId,
              GlobalIdEntity.Product,
            ),
            action: change.create.action as "PIN" | "BOOST" | "EXCLUDE",
            position: (change.create.position as number | null | undefined) ?? null,
            boost: (change.create.boost as string | null | undefined) ?? null,
            enabled: change.create.enabled as boolean,
            startsAt: (change.create.startsAt as string | null | undefined) ?? null,
            endsAt: (change.create.endsAt as string | null | undefined) ?? null,
          },
        });
      } else if (change.update) {
        const { id, targetProductId, ...values } = change.update;
        changes.push({
          kind: "update",
          value: {
            ...values,
            id: decodeGlobalIdByType(id, GlobalIdEntity.ManualProductRecommendation),
            expectedVersion: change.update.expectedVersion as number,
            ...(targetProductId === undefined
              ? {}
              : {
                  targetProductId:
                    targetProductId === null
                      ? undefined
                      : decodeGlobalIdByType(targetProductId, GlobalIdEntity.Product),
                }),
          },
        });
      } else if (change.delete) {
        changes.push({
          kind: "delete",
          value: {
            id: decodeGlobalIdByType(change.delete.id, GlobalIdEntity.ManualProductRecommendation),
            expectedVersion: change.delete.expectedVersion,
          },
        });
      }
    }
    if (userErrors.length > 0) return { active: null, draft: null, userErrors };
    const result = await this.$ctx.kernel.runScript<
      RecommendationSnapshotPreviewParams,
      RecommendationSnapshotPreviewResult
    >(RecommendationSnapshotPreviewScript, {
      anchorProductId: decodeGlobalIdByType(args.input.anchorProductId, GlobalIdEntity.Product),
      placement: args.input.placement,
      policy: args.input.policy,
      manualChanges: changes,
    });
    return {
      active: result.active ? mapPreviewResult(result.active) : null,
      draft: result.draft ? mapPreviewResult(result.draft) : null,
      userErrors: result.userErrors,
    };
  }
}

export class RecommendationMutationResolver extends ListingType<Record<string, never>> {
  private context(): RecommendationWorkflowContext {
    return {
      storeId: this.$ctx.store.id,
      organizationId: this.$ctx.store.organizationId,
      requestId: this.$ctx.requestId,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      defaultLocale: this.$ctx.store.defaultLocale,
    };
  }

  private run<TResult>(name: string, params: unknown): Promise<TResult> {
    const context = this.context();
    const callId = hashContent({ version: 1, name, params });
    return this.$ctx.kernel.getServices().broker.runWorkflow(
      `listing.${name}`,
      { context, params },
      {
        source: "workflow",
        organizationId: context.organizationId,
        workflowId: `${name}:${context.storeId}:${context.requestId}`,
        stepId: "start",
        callId,
      },
      { adminContext: this.$ctx.adminContext },
    ) as Promise<TResult>;
  }

  async policyUpsert(args: {
    input: {
      placement: RecommendationPlacement;
      strategy: "CURATED_ONLY" | "CURATED_FIRST" | "BLENDED" | "AUTOMATED_ONLY";
      minimumResults: number;
      maximumResults: number;
      fallbackChain: string[];
      expectedVersion?: number | null;
    };
  }) {
    const result = await this.run<RecommendationPolicyResult>(
      "recommendationPolicyUpsert",
      args.input,
    );
    return {
      policy: result.policy ? mapRecommendationPolicy(result.policy) : null,
      userErrors: result.userErrors,
    };
  }

  async policySetEnabled(args: {
    input: { placement: RecommendationPlacement; enabled: boolean; expectedVersion: number };
  }) {
    const result = await this.run<RecommendationPolicyResult>(
      "recommendationPolicySetEnabled",
      args.input,
    );
    return {
      policy: result.policy ? mapRecommendationPolicy(result.policy) : null,
      userErrors: result.userErrors,
    };
  }

  async manualCreate(args: {
    input: Record<string, unknown> & { anchorProductId: string; targetProductId: string };
  }) {
    const params = {
      ...args.input,
      anchorProductId: decodeGlobalIdByType(args.input.anchorProductId, GlobalIdEntity.Product),
      targetProductId: decodeGlobalIdByType(args.input.targetProductId, GlobalIdEntity.Product),
    };
    const result = await this.run<ManualRecommendationResult>("manualRecommendationCreate", params);
    return {
      recommendation: result.recommendation ? mapManualRecommendation(result.recommendation) : null,
      userErrors: result.userErrors,
    };
  }

  async manualUpdate(args: {
    input: Record<string, unknown> & { id: string; targetProductId?: string | null };
  }) {
    const { id, ...patch } = args.input;
    const params = {
      ...patch,
      id: decodeGlobalIdByType(id, GlobalIdEntity.ManualProductRecommendation),
      ...(args.input.targetProductId == null
        ? {}
        : {
            targetProductId: decodeGlobalIdByType(
              args.input.targetProductId,
              GlobalIdEntity.Product,
            ),
          }),
    };
    const result = await this.run<ManualRecommendationResult>("manualRecommendationUpdate", params);
    return {
      recommendation: result.recommendation ? mapManualRecommendation(result.recommendation) : null,
      userErrors: result.userErrors,
    };
  }

  async manualDelete(args: { input: { id: string; expectedVersion: number } }) {
    const result = await this.run<ManualRecommendationResult>("manualRecommendationDelete", {
      id: decodeGlobalIdByType(args.input.id, GlobalIdEntity.ManualProductRecommendation),
      expectedVersion: args.input.expectedVersion,
    });
    return {
      deletedId: result.deletedId
        ? encodeGlobalIdByType(result.deletedId, GlobalIdEntity.ManualProductRecommendation)
        : null,
      userErrors: result.userErrors,
    };
  }
}

function mapPreviewResult(result: NonNullable<RecommendationSnapshotPreviewResult["active"]>) {
  return {
    asOf: result.asOf,
    modelVersion: result.modelVersion,
    candidates: result.candidates.map((candidate) => ({
      product: toListingNodeReference(candidate.targetProductId),
      rank: candidate.rank,
      score: candidate.score,
      source: candidate.primarySource,
      sourceBreakdown: {
        manualAction: candidate.sourceBreakdown.manual?.action ?? null,
        manualPosition: candidate.sourceBreakdown.manual?.position ?? null,
        manualBoost: candidate.sourceBreakdown.manual?.boost ?? null,
        fbtRunId: candidate.sourceBreakdown.fbt?.runId
          ? encodeGlobalIdByType(
              candidate.sourceBreakdown.fbt.runId,
              GlobalIdEntity.RecommendationCalculationRun,
            )
          : null,
        fbtSourceScore: candidate.sourceBreakdown.fbt?.sourceScore ?? null,
        categoryPopularityScore: candidate.sourceBreakdown.categoryPopularity?.score ?? null,
        storePopularityScore: candidate.sourceBreakdown.storePopularity?.score ?? null,
      },
    })),
    excluded: result.excluded.map((item) => ({
      product: toListingNodeReference(item.targetProductId),
      reason: item.reason,
    })),
  };
}
