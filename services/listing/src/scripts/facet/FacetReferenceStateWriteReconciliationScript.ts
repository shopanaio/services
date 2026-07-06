import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { FacetSource } from "../../repositories/models/index.js";

export type ReferenceStatus = FacetSource["referenceStatus"];

export interface ReferenceStatusUpdate {
  id: string;
  nextStatus: ReferenceStatus;
}

export interface ReferenceStatusDelta {
  id: string;
  previousStatus: ReferenceStatus;
  nextStatus: ReferenceStatus;
  changed: boolean;
}

export interface FacetReferenceStateWriteReconciliationParams {
  sourceUpdates: ReferenceStatusUpdate[];
  valueUpdates: ReferenceStatusUpdate[];
}

export interface FacetReferenceStateWriteReconciliationResult {
  sourceDeltas: ReferenceStatusDelta[];
  valueDeltas: ReferenceStatusDelta[];
}

export class FacetReferenceStateWriteReconciliationScript extends BaseScript<
  FacetReferenceStateWriteReconciliationParams,
  FacetReferenceStateWriteReconciliationResult
> {
  @Transactional()
  protected async execute(
    params: FacetReferenceStateWriteReconciliationParams
  ): Promise<FacetReferenceStateWriteReconciliationResult> {
    const sourceDeltas: ReferenceStatusDelta[] = [];
    const valueDeltas: ReferenceStatusDelta[] = [];

    for (const update of params.sourceUpdates) {
      const delta = await this.repository.facet.refreshSourceStatus(
        update.id,
        update.nextStatus
      );
      if (delta) sourceDeltas.push(delta);
    }

    for (const update of params.valueUpdates) {
      const delta = await this.repository.facetValue.refreshValueStatus(
        update.id,
        update.nextStatus
      );
      if (delta) valueDeltas.push(delta);
    }

    return {
      sourceDeltas,
      valueDeltas,
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
