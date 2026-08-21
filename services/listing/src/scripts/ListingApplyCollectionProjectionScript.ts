import {
  verifyCollectionListingSnapshotV1,
  type CatalogCollectionSnapshot,
} from "@shopana/broker-types";
import { BaseScript, Transactional } from "../kernel/BaseScript.js";
import {
  CollectionProjectionConflictError,
  type CollectionProjectionApplyStatus,
} from "../repositories/listing/CollectionStateRepository.js";

export interface ListingApplyCollectionProjectionInput {
  snapshot: CatalogCollectionSnapshot;
  eventSequence: number;
}

export interface ListingApplyCollectionProjectionResult {
  collectionId: string;
  status: CollectionProjectionApplyStatus;
  processedAt: string;
}

export class ListingCollectionProjectionError extends Error {
  constructor(
    readonly code:
      | "INVALID_COLLECTION_EVENT_SEQUENCE"
      | "COLLECTION_SOURCE_INCONSISTENT"
      | "COLLECTION_SNAPSHOT_INVALID",
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ListingCollectionProjectionError";
  }
}

export class ListingApplyCollectionProjectionScript extends BaseScript<
  ListingApplyCollectionProjectionInput,
  ListingApplyCollectionProjectionResult
> {
  @Transactional()
  protected async execute(
    input: ListingApplyCollectionProjectionInput,
  ): Promise<ListingApplyCollectionProjectionResult> {
    if (!Number.isSafeInteger(input.eventSequence) || input.eventSequence <= 0) {
      throw new ListingCollectionProjectionError(
        "INVALID_COLLECTION_EVENT_SEQUENCE",
        "Collection event sequence must be a positive safe integer",
        false,
      );
    }
    if (input.snapshot.storeId !== this.context.store.id) {
      throw new ListingCollectionProjectionError(
        "COLLECTION_SNAPSHOT_INVALID",
        "Collection snapshot store does not match the listing context",
        false,
      );
    }
    try {
      verifyCollectionListingSnapshotV1(input.snapshot);
    } catch (error) {
      throw new ListingCollectionProjectionError(
        "COLLECTION_SNAPSHOT_INVALID",
        error instanceof Error ? error.message : "Collection snapshot is invalid",
        false,
      );
    }
    let status: CollectionProjectionApplyStatus;
    try {
      status =
        input.snapshot.state === "live"
          ? await this.repository.collectionState.applyLive(input.snapshot, input.eventSequence)
          : await this.applyDeleted(input.snapshot, input.eventSequence);
    } catch (error) {
      if (error instanceof CollectionProjectionConflictError) {
        this.logger.error(
          {
            operation: input.snapshot.state === "live" ? "apply" : "delete",
            status: "conflict",
            collectionId: input.snapshot.id,
          },
          "Collection projection conflict",
        );
      }
      throw error;
    }
    this.logger.info(
      {
        operation: input.snapshot.state === "live" ? "apply" : "delete",
        status,
        collectionId: input.snapshot.id,
        collectionType: input.snapshot.state === "live" ? input.snapshot.type : "deleted",
        projectionLagMs: Math.max(
          0,
          Date.now() -
            Date.parse(
              input.snapshot.state === "live"
                ? input.snapshot.listingUpdatedAt
                : input.snapshot.deletedAt,
            ),
        ),
      },
      "Collection projection processed",
    );
    return {
      collectionId: input.snapshot.id,
      status,
      processedAt: new Date().toISOString(),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private async applyDeleted(
    snapshot: Extract<CatalogCollectionSnapshot, { state: "deleted" }>,
    eventSequence: number,
  ): Promise<CollectionProjectionApplyStatus> {
    const status = await this.repository.collectionState.applyDeleted(snapshot, eventSequence);
    if (status !== "applied") return status;
    await this.repository.listingPostingBitmap.deleteByKey({
      entityType: "product",
      field: "collection",
      valueKey: snapshot.id,
    });
    await this.repository.listingPostingProductSort.deleteByManualScopeId(snapshot.id);
    return status;
  }
}
