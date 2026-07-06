import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  hashContent,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { Catalog } from "@shopana/broker-types";
import type { EventEmitResult } from "@shopana/events";
import type { FacetIndexImpactSourceRef } from "../scripts/facet/FacetIndexImpactCollectorScript.js";

export type FacetAffectedProductsResyncReason =
  | "facet_created"
  | "facet_deleted"
  | "facet_value_created"
  | "facet_value_updated"
  | "facet_value_deleted"
  | "facet_value_merged"
  | "facet_value_unmerged";

export interface FacetAffectedProductsResyncWorkflowInput {
  storeId: string;
  organizationId: string;
  reason: FacetAffectedProductsResyncReason;
  operationId: string;
  oldRefs?: FacetIndexImpactSourceRef[];
  newRefs?: FacetIndexImpactSourceRef[];
  facetIds?: string[];
  userId?: string;
  limit?: number;
}

export interface FacetAffectedProductsResyncWorkflowResult {
  refsHash: string;
  affectedProductCount: number;
  emittedEventIds: string[];
}

type ListingFacetMembershipChangedEmitParams = {
  eventType: "listingFacetMembershipChanged";
  payload: {
    storeId: string;
    productId: string;
    reason: FacetAffectedProductsResyncReason;
    operationId: string;
    facetIds: string[];
    refsHash: string;
  };
  source: "listing";
  context: {
    organizationId: string;
    userId?: string;
    correlationId?: string;
  };
  subject: { type: "product"; id: string };
  actor?: { type: "user"; id: string } | { type: "system" };
  emitKey: string;
};

@Injectable()
export class FacetAffectedProductsResyncWorkflow extends BrokerWorkflows<
  FacetAffectedProductsResyncWorkflowInput,
  FacetAffectedProductsResyncWorkflowResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("resyncFacetAffectedProducts")
  async run(
    input: FacetAffectedProductsResyncWorkflowInput
  ): Promise<FacetAffectedProductsResyncWorkflowResult> {
    const refs = normalizeRefs([...(input.oldRefs ?? []), ...(input.newRefs ?? [])]);
    const refsHash = hashContent({ v: 1, refs });
    // Problem: this stores one event id per affected product across all pages, and DBOS persists
    // the full array in the durable workflow output for large facet changes.
    const emittedEventIds: string[] = [];

    if (refs.length === 0) {
      return {
        refsHash,
        affectedProductCount: 0,
        emittedEventIds,
      };
    }

    let cursor: string | undefined;
    do {
      const page = await this.stepFindAffectedProducts({
        storeId: input.storeId,
        refs,
        afterProductId: cursor,
        limit: input.limit ?? 100,
      });

      if (page.productIds.length === 0) {
        break;
      }

      const pageEventIds = await this.emitProductInvalidationEvents({
        input,
        productIds: page.productIds,
        refsHash,
      });
      emittedEventIds.push(...pageEventIds);
      cursor = page.nextCursor;
    } while (cursor);

    return {
      refsHash,
      affectedProductCount: emittedEventIds.length,
      emittedEventIds,
    };
  }

  @WorkflowStep({
    name: "findListingFacetAffectedProducts",
    timeoutMs: 60_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async stepFindAffectedProducts(
    params: Catalog.FindListingFacetAffectedProductsParams
  ): Promise<Catalog.FindListingFacetAffectedProductsResult> {
    return this.broker.call<
      Catalog.FindListingFacetAffectedProductsResult,
      Catalog.FindListingFacetAffectedProductsParams
    >("catalog.findListingFacetAffectedProducts", params);
  }

  private async emitProductInvalidationEvents(params: {
    input: FacetAffectedProductsResyncWorkflowInput;
    productIds: string[];
    refsHash: string;
  }): Promise<string[]> {
    const eventIds: string[] = [];
    const facetIds = [...new Set(params.input.facetIds ?? [])].sort();

    for (const productId of params.productIds) {
      const result = await this.broker.runWorkflow<
        EventEmitResult,
        ListingFacetMembershipChangedEmitParams
      >(
        "events.emit",
        {
          eventType: "listingFacetMembershipChanged",
          payload: {
            storeId: params.input.storeId,
            productId,
            reason: params.input.reason,
            operationId: params.input.operationId,
            facetIds,
            refsHash: params.refsHash,
          },
          source: "listing",
          context: {
            organizationId: params.input.organizationId,
            userId: params.input.userId,
          },
          subject: { type: "product", id: productId },
          actor: params.input.userId
            ? { type: "user", id: params.input.userId }
            : { type: "system" },
          emitKey: `listing:facet-resync:${params.input.operationId}:product:${productId}`,
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "emitListingFacetMembershipChanged",
          callId: productId,
          organizationId: params.input.organizationId,
        }
      );
      eventIds.push(result.eventId);
    }

    return eventIds;
  }
}

function normalizeRefs(
  refs: readonly FacetIndexImpactSourceRef[]
): FacetIndexImpactSourceRef[] {
  return [
    ...new Map(
      refs.map((ref) => [
        `${ref.facetType}\0${ref.sourceHandle}\0${ref.sourceValueHandle ?? ""}`,
        ref,
      ])
    ).values(),
  ].sort(
    (left, right) =>
      left.facetType.localeCompare(right.facetType) ||
      left.sourceHandle.localeCompare(right.sourceHandle) ||
      (left.sourceValueHandle ?? "").localeCompare(right.sourceValueHandle ?? "")
  );
}
