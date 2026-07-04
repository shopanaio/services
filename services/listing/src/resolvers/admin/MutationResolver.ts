import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation } from "@shopana/type-resolver";
import type { UserError } from "../../kernel/BaseScript.js";
import {
  FacetCreateScript,
  FacetDeleteScript,
  FacetMoveScript,
  FacetRebalanceScript,
  FacetSwatchCreateScript,
  FacetSwatchDeleteScript,
  FacetSwatchUpdateScript,
  FacetUpdateScript,
  FacetValueCreateScript,
  FacetValueDeleteScript,
  FacetValueMergeScript,
  FacetValueUnmergeScript,
  FacetValueUpdateScript,
} from "../../scripts/facet/index.js";
import { FacetResolver } from "./FacetResolver.js";
import { FacetSwatchResolver } from "./FacetSwatchResolver.js";
import { FacetValueResolver } from "./FacetValueResolver.js";
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
  listingMutation() {
    return new ListingMutationResolver({}, this.$ctx);
  }
}

export class ListingMutationResolver extends ListingType<Record<string, never>> {
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
    };
  }) {
    const result = await this.$ctx.kernel.runScript(FacetCreateScript, {
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
    });

    return {
      facet: result.facet ? new FacetResolver(result.facet.id, this.$ctx) : null,
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
    });

    return {
      facet: result.facet ? new FacetResolver(result.facet.id, this.$ctx) : null,
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
    const result = await this.$ctx.kernel.runScript(FacetDeleteScript, { id });
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
      facet: result.facet ? new FacetResolver(result.facet.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async facetRebalance(_args: { input: { confirm?: boolean | null } }) {
    const result = await this.$ctx.kernel.runScript(FacetRebalanceScript, {});

    return {
      facets: result.facets.map((facet) => new FacetResolver(facet.id, this.$ctx)),
      userErrors: result.userErrors,
    };
  }

  async facetValueCreate(args: {
    input: {
      facetId: string;
      kind?: "SOURCE" | "DISPLAY" | null;
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

    const result = await this.$ctx.kernel.runScript(FacetValueCreateScript, {
      facetId,
      kind: (args.input.kind ?? "DISPLAY").toLowerCase() as "source" | "display",
      handle: args.input.handle,
      label: args.input.label,
      sourceValueIds: decodedSourceValues.ids,
      swatchId,
      sortIndex: args.input.sortIndex ?? undefined,
      enabled: args.input.enabled ?? undefined,
    });

    return {
      facetValue: result.facetValue
        ? new FacetValueResolver(result.facetValue.id, this.$ctx)
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
    const result = await this.$ctx.kernel.runScript(FacetValueUpdateScript, {
      id,
      handle: args.input.handle ?? undefined,
      label: args.input.label ?? undefined,
      swatchId,
      sortIndex: args.input.sortIndex ?? undefined,
      enabled: args.input.enabled ?? undefined,
    });

    return {
      facetValue: result.facetValue
        ? new FacetValueResolver(result.facetValue.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async facetValueMerge(args: {
    input: {
      facetId: string;
      targetDisplayValueId?: string | null;
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

    const targetDisplayValueId = args.input.targetDisplayValueId
      ? safeDecodeGlobalId(args.input.targetDisplayValueId, GlobalIdEntity.FacetValue)
      : undefined;
    if (args.input.targetDisplayValueId && !targetDisplayValueId) {
      return {
        facetValue: null,
        sourceValues: [],
        userErrors: [{ message: "Invalid target display value ID", field: ["input", "targetDisplayValueId"], code: "INVALID_ID" }],
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

    const result = await this.$ctx.kernel.runScript(FacetValueMergeScript, {
      facetId,
      targetDisplayValueId: targetDisplayValueId ?? undefined,
      targetHandle: args.input.targetHandle ?? undefined,
      targetLabel: args.input.targetLabel ?? undefined,
      sourceValueIds: decodedSourceValues.ids,
    });

    return {
      facetValue: result.facetValue
        ? new FacetValueResolver(result.facetValue.id, this.$ctx)
        : null,
      sourceValues: result.sourceValues.map(
        (value) => new FacetValueResolver(value.id, this.$ctx)
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
        affectedDisplayValues: [],
        userErrors: decodedSourceValues.userErrors,
      };
    }

    const result = await this.$ctx.kernel.runScript(FacetValueUnmergeScript, {
      sourceValueIds: decodedSourceValues.ids,
    });

    return {
      sourceValues: result.sourceValues.map(
        (value) => new FacetValueResolver(value.id, this.$ctx)
      ),
      affectedDisplayValues: result.affectedDisplayValues.map(
        (value) => new FacetValueResolver(value.id, this.$ctx)
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
    const result = await this.$ctx.kernel.runScript(FacetValueDeleteScript, {
      id,
    });
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
        ? new FacetSwatchResolver(result.facetSwatch.id, this.$ctx)
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
        ? new FacetSwatchResolver(result.facetSwatch.id, this.$ctx)
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
