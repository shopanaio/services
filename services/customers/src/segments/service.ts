import {
  validateSegmentQuery,
  type SegmentStoreEvaluationContext,
  type SegmentValidationResult,
} from "@shopana/customer-segment-dsl";
import type { ContextStore } from "@shopana/shared-context";
import type { Repository } from "../repositories/Repository.js";
import { CUSTOMER_SEGMENT_REGISTRY } from "./registry.js";

export class SegmentStoreContextNotReadyError extends Error {
  readonly code = "SEGMENT_STORE_CONTEXT_NOT_READY";

  constructor(storeId: string) {
    super(`Segment Store context is not ready for ${storeId}`);
    this.name = "SegmentStoreContextNotReadyError";
  }
}

export async function resolveSegmentStoreContext(
  repository: Repository,
  trusted: ContextStore,
): Promise<SegmentStoreEvaluationContext> {
  const local = await repository.segmentStoreContext.findByStoreId(trusted.id);
  if (
    !local ||
    local.configurationRevision !== trusted.segmentConfigurationRevision ||
    local.currencyCode !== trusted.currencyCode ||
    local.currencyExponent !== trusted.currencyExponent ||
    local.timeZone !== trusted.timezone
  ) {
    throw new SegmentStoreContextNotReadyError(trusted.id);
  }
  return {
    storeId: local.storeId,
    currencyCode: local.currencyCode,
    currencyExponent: local.currencyExponent,
    timeZone: local.timeZone,
    configurationRevision: local.configurationRevision,
  };
}

export async function validateCustomerSegmentQuery(
  repository: Repository,
  query: string,
  storeContext: SegmentStoreEvaluationContext,
  effectiveAt: string,
): Promise<SegmentValidationResult> {
  return validateSegmentQuery(query, CUSTOMER_SEGMENT_REGISTRY, {
    storeContext,
    effectiveAt,
    entityExists: async (storeId, references) => {
      if (storeId !== storeContext.storeId) {
        throw new Error("Segment entity validation cannot cross tenant boundary");
      }
      return repository.segmentEvaluation.existingEntityReferences(references);
    },
  });
}
