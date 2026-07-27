import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation } from "@shopana/type-resolver";
import { hashContent } from "@shopana/shared-kernel";
import type { UserError } from "../../kernel/BaseScript.js";
import {
  FacetMoveScript,
  FacetRebalanceScript,
  FacetSwatchCreateScript,
  FacetSwatchDeleteScript,
  FacetSwatchUpdateScript,
  FacetScopesUpdateScript,
  FacetUpdateScript,
} from "../../scripts/facet/index.js";
import type {
  FacetCreateParams,
  FacetDeleteResult,
  FacetResult,
  FacetScopesUpdateParams,
  FacetScopesUpdateResult,
  FacetValueCreateParams,
  FacetValueDeleteResult,
  FacetValueMergeParams,
  FacetValueMergeResult,
  FacetValueResult,
  FacetValueUnmergeParams,
  FacetValueUnmergeResult,
  FacetValueUpdateParams,
} from "../../scripts/facet/dto/index.js";
import type { FacetScopeType } from "../../repositories/facet/facetScopes.js";
import { ListingType } from "./ListingType.js";

function safeDecodeGlobalId(
  globalId: string,
  expectedType: GlobalIdType
): string | null {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    return null;
  }
}

function safeDecodeGlobalIds(
  globalIds: readonly string[],
  expectedType: GlobalIdType,
  field: string[]
): { ids: string[]; userErrors: UserError[] } {
  const ids: string[] = [];
  const userErrors: UserError[] = [];

  for (const [index, globalId] of globalIds.entries()) {
    const id = safeDecodeGlobalId(globalId, expectedType);
    if (!id) {
      userErrors.push({
        message: "Invalid ID",
        field: [...field, String(index)],
        code: "INVALID_ID",
      });
      continue;
    }
    ids.push(id);
  }

  return { ids, userErrors };
}

@ApolloMutation
export class MutationResolver extends ListingType<Record<string, never>> {
  async listingMutation() {
    return this.resolvers.listingMutation();
  }
}

export class ListingMutationResolver extends ListingType<Record<string, never>> {
  async search() {
    return this.resolvers.listingSearchMutation();
  }

  private facetWorkflowContext() {
    return {
      storeId: this.$ctx.store.id,
      organizationId: this.$ctx.store.organizationId,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      defaultLocale: this.$ctx.store.defaultLocale,
      requestId: this.$ctx.requestId,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
    };
  }

  private async runFacetMutationWorkflow<TResult, TParams>(
    workflowName: string,
    params: TParams,
    operation: string,
    resourceId: string
  ): Promise<TResult> {
    const paramsHash = hashContent({
      v: 1,
      workflowName,
      resourceId,
      params,
    }).slice(0, 32);
    const callId = paramsHash;
    const operationId = [
      "listing",
      operation,
      this.$ctx.store.id,
      resourceId,
      this.$ctx.requestId,
      callId,
    ].join(":");

    return this.$ctx.kernel.getServices().broker.runWorkflow(
      `listing.${workflowName}`,
      {
        params,
        context: this.facetWorkflowContext(),
        operationId,
      },
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId: `${workflowName}:${this.$ctx.store.id}:${resourceId}:${this.$ctx.requestId}`,
        stepId: "start",
        callId,
      },
      { adminContext: this.$ctx.adminContext },
    ) as Promise<TResult>;
  }

  async facetCreate(args: {
    input: {
      facetType: "PRICE" | "TAG" | "FEATURE" | "OPTION" | "IN_STOCK";
      slug: string;
      label: string;
      uiType?: "CHECKBOX" | "RADIO" | "DROPDOWN" | "RANGE" | "BOOLEAN" | null;
      selectionMode?: "SINGLE" | "MULTI" | null;
      sources?: Array<{
        handle: string;
        name: string;
      }> | null;
      valueCandidates?: Array<{
        handle: string;
        label: string;
        sourceHandle: string;
      }> | null;
      scopes?: FacetScopeType[] | null;
    };
  }) {
    const result = await this.runFacetMutationWorkflow<
      FacetResult,
      FacetCreateParams
    >("facetCreate", {
      facetType: args.input.facetType,
      slug: args.input.slug,
      label: args.input.label,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
      sources: args.input.sources?.map((source) => ({
        handle: source.handle,
        name: source.name,
      })),
      valueCandidates: args.input.valueCandidates?.map((candidate) => ({
        handle: candidate.handle,
        label: candidate.label,
        sourceHandle: candidate.sourceHandle,
      })),
      scopes: args.input.scopes ?? undefined,
    }, "facetCreate", args.input.slug);

    return {
      facet: result.facet ? await this.resolvers.facet(result.facet.id) : null,
      userErrors: result.userErrors,
    };
  }

  async facetUpdate(args: {
    input: {
      id: string;
      slug?: string | null;
      label?: string | null;
      uiType?: "CHECKBOX" | "RADIO" | "DROPDOWN" | "RANGE" | "BOOLEAN" | null;
      selectionMode?: "SINGLE" | "MULTI" | null;
      scopes?: FacetScopeType[] | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Facet);
    if (!id) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetUpdateScript, {
      id,
      slug: args.input.slug ?? undefined,
      label: args.input.label ?? undefined,
      uiType: args.input.uiType?.toLowerCase(),
      selectionMode: args.input.selectionMode?.toLowerCase(),
      scopes: args.input.scopes ?? undefined,
    });

    return {
      facet: result.facet ? await this.resolvers.facet(result.facet.id) : null,
      userErrors: result.userErrors,
    };
  }

  async facetScopesUpdate(args: {
    input: {
      updates: Array<{
        id: string;
        scopes: FacetScopeType[];
      }>;
    };
  }) {
    const decodedUpdates: FacetScopesUpdateParams["updates"] = [];
    const userErrors: UserError[] = [];

    for (const [index, update] of args.input.updates.entries()) {
      const id = safeDecodeGlobalId(update.id, GlobalIdEntity.Facet);
      if (!id) {
        userErrors.push({
          message: "Invalid facet ID",
          field: ["input", "updates", String(index), "id"],
          code: "INVALID_ID",
        });
        continue;
      }
      decodedUpdates.push({ id, scopes: update.scopes });
    }

    if (userErrors.length > 0) {
      return { facets: [], userErrors };
    }

    const result = await this.$ctx.kernel.runScript<
      FacetScopesUpdateParams,
      FacetScopesUpdateResult
    >(FacetScopesUpdateScript, { updates: decodedUpdates });

    return {
      facets: await Promise.all(
        result.facets.map((facet) => this.resolvers.facet(facet.id))
      ),
      userErrors: result.userErrors,
    };
  }

  async facetDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Facet);
    if (!id) {
      return {
        deletedFacetId: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.runFacetMutationWorkflow<
      FacetDeleteResult,
      { id: string }
    >("facetDelete", { id }, "facetDelete", id);
    return {
      deletedFacetId: result.deletedFacetId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async facetMove(args: {
    input: {
      id: string;
      afterFacetId?: string | null;
      beforeFacetId?: string | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.Facet);
    if (!id) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }

    const afterFacetId = args.input.afterFacetId
      ? safeDecodeGlobalId(args.input.afterFacetId, GlobalIdEntity.Facet)
      : undefined;
    if (args.input.afterFacetId && !afterFacetId) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid after facet ID", field: ["input", "afterFacetId"], code: "INVALID_ID" }],
      };
    }

    const beforeFacetId = args.input.beforeFacetId
      ? safeDecodeGlobalId(args.input.beforeFacetId, GlobalIdEntity.Facet)
      : undefined;
    if (args.input.beforeFacetId && !beforeFacetId) {
      return {
        facet: null,
        userErrors: [{ message: "Invalid before facet ID", field: ["input", "beforeFacetId"], code: "INVALID_ID" }],
      };
    }

    const result = await this.$ctx.kernel.runScript(FacetMoveScript, {
      id,
      afterFacetId,
      beforeFacetId,
    });

    return {
      facet: result.facet ? await this.resolvers.facet(result.facet.id) : null,
      userErrors: result.userErrors,
    };
  }

  async facetRebalance(_args: { input: { confirm?: boolean | null } }) {
    const result = await this.$ctx.kernel.runScript(FacetRebalanceScript, {});

    return {
      facets: await Promise.all(
        result.facets.map((facet) => this.resolvers.facet(facet.id))
      ),
      userErrors: result.userErrors,
    };
  }

  async facetValueCreate(args: {
    input: {
      facetId: string;
      kind?: "SOURCE" | "GROUP" | null;
      handle: string;
      label: string;
      sourceValueIds?: string[] | null;
      swatchId?: string | null;
      sortIndex?: number | null;
      enabled?: boolean | null;
    };
  }) {
    const facetId = safeDecodeGlobalId(args.input.facetId, GlobalIdEntity.Facet);
    if (!facetId) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid facet ID", field: ["input", "facetId"], code: "INVALID_ID" }],
      };
    }
    const swatchId = args.input.swatchId
      ? safeDecodeGlobalId(args.input.swatchId, GlobalIdEntity.FacetSwatch)
      : undefined;
    if (args.input.swatchId && !swatchId) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid swatch ID", field: ["input", "swatchId"], code: "INVALID_ID" }],
      };
    }

    const decodedSourceValues = safeDecodeGlobalIds(
      args.input.sourceValueIds ?? [],
      GlobalIdEntity.FacetValue,
      ["input", "sourceValueIds"]
    );
    if (decodedSourceValues.userErrors.length > 0) {
      return { facetValue: null, userErrors: decodedSourceValues.userErrors };
    }

    const result = await this.runFacetMutationWorkflow<
      FacetValueResult,
      FacetValueCreateParams
    >("facetValueCreate", {
      facetId,
      kind: (args.input.kind ?? "GROUP").toLowerCase() as "source" | "group",
      handle: args.input.handle,
      label: args.input.label,
      sourceValueIds: decodedSourceValues.ids,
      swatchId,
      sortIndex: args.input.sortIndex ?? undefined,
      enabled: args.input.enabled ?? undefined,
    }, "facetValueCreate", facetId);

    return {
      facetValue: result.facetValue
        ? await this.resolvers.facetValue(result.facetValue.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetValueUpdate(args: {
    input: {
      id: string;
      handle?: string | null;
      label?: string | null;
      swatchId?: string | null;
      sortIndex?: number | null;
      enabled?: boolean | null;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetValue);
    if (!id) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid facet value ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const swatchId = args.input.swatchId
      ? safeDecodeGlobalId(args.input.swatchId, GlobalIdEntity.FacetSwatch)
      : args.input.swatchId === null
        ? null
        : undefined;
    if (args.input.swatchId && !swatchId) {
      return {
        facetValue: null,
        userErrors: [{ message: "Invalid swatch ID", field: ["input", "swatchId"], code: "INVALID_ID" }],
      };
    }
    const result = await this.runFacetMutationWorkflow<
      FacetValueResult,
      FacetValueUpdateParams
    >("facetValueUpdate", {
      id,
      handle: args.input.handle ?? undefined,
      label: args.input.label ?? undefined,
      swatchId,
      sortIndex: args.input.sortIndex ?? undefined,
      enabled: args.input.enabled ?? undefined,
    }, "facetValueUpdate", id);

    return {
      facetValue: result.facetValue
        ? await this.resolvers.facetValue(result.facetValue.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetValueMerge(args: {
    input: {
      facetId: string;
      targetGroupValueId?: string | null;
      targetHandle?: string | null;
      targetLabel?: string | null;
      sourceValueIds: string[];
    };
  }) {
    const facetId = safeDecodeGlobalId(args.input.facetId, GlobalIdEntity.Facet);
    if (!facetId) {
      return {
        facetValue: null,
        sourceValues: [],
        userErrors: [{ message: "Invalid facet ID", field: ["input", "facetId"], code: "INVALID_ID" }],
      };
    }

    const targetGroupValueId = args.input.targetGroupValueId
      ? safeDecodeGlobalId(args.input.targetGroupValueId, GlobalIdEntity.FacetValue)
      : undefined;
    if (args.input.targetGroupValueId && !targetGroupValueId) {
      return {
        facetValue: null,
        sourceValues: [],
        userErrors: [{ message: "Invalid target group value ID", field: ["input", "targetGroupValueId"], code: "INVALID_ID" }],
      };
    }

    const decodedSourceValues = safeDecodeGlobalIds(
      args.input.sourceValueIds,
      GlobalIdEntity.FacetValue,
      ["input", "sourceValueIds"]
    );
    if (decodedSourceValues.userErrors.length > 0) {
      return {
        facetValue: null,
        sourceValues: [],
        userErrors: decodedSourceValues.userErrors,
      };
    }

    const result = await this.runFacetMutationWorkflow<
      FacetValueMergeResult,
      FacetValueMergeParams
    >("facetValueMerge", {
      facetId,
      targetGroupValueId: targetGroupValueId ?? undefined,
      targetHandle: args.input.targetHandle ?? undefined,
      targetLabel: args.input.targetLabel ?? undefined,
      sourceValueIds: decodedSourceValues.ids,
    }, "facetValueMerge", facetId);

    return {
      facetValue: result.facetValue
        ? await this.resolvers.facetValue(result.facetValue.id)
        : null,
      sourceValues: await Promise.all(
        result.sourceValues.map((value) => this.resolvers.facetValue(value.id))
      ),
      userErrors: result.userErrors,
    };
  }

  async facetValueUnmerge(args: {
    input: {
      sourceValueIds: string[];
    };
  }) {
    const decodedSourceValues = safeDecodeGlobalIds(
      args.input.sourceValueIds,
      GlobalIdEntity.FacetValue,
      ["input", "sourceValueIds"]
    );
    if (decodedSourceValues.userErrors.length > 0) {
      return {
        sourceValues: [],
        affectedGroupValues: [],
        userErrors: decodedSourceValues.userErrors,
      };
    }

    const result = await this.runFacetMutationWorkflow<
      FacetValueUnmergeResult,
      FacetValueUnmergeParams
    >("facetValueUnmerge", {
      sourceValueIds: decodedSourceValues.ids,
    }, "facetValueUnmerge", decodedSourceValues.ids.join(","));

    return {
      sourceValues: await Promise.all(
        result.sourceValues.map((value) => this.resolvers.facetValue(value.id))
      ),
      affectedGroupValues: await Promise.all(
        result.affectedGroupValues.map((value) =>
          this.resolvers.facetValue(value.id)
        )
      ),
      userErrors: result.userErrors,
    };
  }

  async facetValueDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetValue);
    if (!id) {
      return {
        deletedFacetValueId: null,
        userErrors: [{ message: "Invalid facet value ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.runFacetMutationWorkflow<
      FacetValueDeleteResult,
      { id: string }
    >("facetValueDelete", { id }, "facetValueDelete", id);
    return {
      deletedFacetValueId: result.deletedFacetValueId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }

  async facetSwatchCreate(args: {
    input: {
      swatchType: "COLOR" | "GRADIENT" | "IMAGE";
      colorOne?: string | null;
      colorTwo?: string | null;
      fileId?: string | null;
      metadata?: unknown;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetSwatchCreateScript, {
      swatchType: args.input.swatchType.toLowerCase(),
      colorOne: args.input.colorOne ?? undefined,
      colorTwo: args.input.colorTwo ?? undefined,
      fileId: args.input.fileId
        ? decodeGlobalIdByType(args.input.fileId, GlobalIdEntity.File)
        : undefined,
      metadata: args.input.metadata,
    });
    return {
      facetSwatch: result.facetSwatch
        ? await this.resolvers.facetSwatch(result.facetSwatch.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetSwatchUpdate(args: {
    input: {
      id: string;
      swatchType?: "COLOR" | "GRADIENT" | "IMAGE" | null;
      colorOne?: string | null;
      colorTwo?: string | null;
      fileId?: string | null;
      metadata?: unknown;
    };
  }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetSwatch);
    if (!id) {
      return {
        facetSwatch: null,
        userErrors: [{ message: "Invalid facet swatch ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetSwatchUpdateScript, {
      id,
      swatchType: args.input.swatchType?.toLowerCase(),
      colorOne: args.input.colorOne ?? undefined,
      colorTwo: args.input.colorTwo ?? undefined,
      fileId: args.input.fileId
        ? safeDecodeGlobalId(args.input.fileId, GlobalIdEntity.File)
        : undefined,
      metadata: args.input.metadata,
    });
    return {
      facetSwatch: result.facetSwatch
        ? await this.resolvers.facetSwatch(result.facetSwatch.id)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetSwatchDelete(args: { input: { id: string } }) {
    const id = safeDecodeGlobalId(args.input.id, GlobalIdEntity.FacetSwatch);
    if (!id) {
      return {
        deletedFacetSwatchId: null,
        userErrors: [{ message: "Invalid facet swatch ID", field: ["input", "id"], code: "INVALID_ID" }],
      };
    }
    const result = await this.$ctx.kernel.runScript(FacetSwatchDeleteScript, {
      id,
    });
    return {
      deletedFacetSwatchId: result.deletedFacetSwatchId ? args.input.id : null,
      userErrors: result.userErrors,
    };
  }
}
