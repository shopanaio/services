import type { Catalog } from "@shopana/broker-types";
import { and, eq, inArray } from "drizzle-orm";
import { BaseScript } from "../kernel/BaseScript.js";
import {
  product,
  productTranslation,
  variant,
} from "../repositories/models/index.js";

export type GetInventoryItemProjectionSnapshotParams =
  Catalog.GetInventoryItemProjectionSnapshotParams;
export type GetInventoryItemProjectionSnapshotResult =
  Catalog.GetInventoryItemProjectionSnapshotResult;

export class GetInventoryItemProjectionSnapshotScript extends BaseScript<
  GetInventoryItemProjectionSnapshotParams,
  GetInventoryItemProjectionSnapshotResult
> {
  protected async execute(
    params: GetInventoryItemProjectionSnapshotParams
  ): Promise<GetInventoryItemProjectionSnapshotResult> {
    if (!params.productId) {
      return {
        ok: false,
        code: "INVALID_CATALOG_SNAPSHOT_INPUT",
        message: "productId is required.",
        retryable: false,
      };
    }

    const storeId = this.getProjectId();
    const productRows = await this.repository.db
      .select({
        id: product.id,
        handle: product.handle,
        deletedAt: product.deletedAt,
        revision: product.revision,
      })
      .from(product)
      .where(and(eq(product.projectId, storeId), eq(product.id, params.productId)))
      .limit(1);

    const productRow = productRows[0];
    if (!productRow) {
      return {
        ok: false,
        code: "CATALOG_PRODUCT_NOT_FOUND",
        message: "Catalog product was not found.",
        retryable: false,
      };
    }

    const variantFilters = [
      eq(variant.projectId, storeId),
      eq(variant.productId, params.productId),
    ];
    if (params.variantIds && params.variantIds.length > 0) {
      variantFilters.push(inArray(variant.id, params.variantIds));
    }

    const translationFilters = [
      eq(productTranslation.projectId, storeId),
      eq(productTranslation.productId, params.productId),
    ];
    if (params.locales && params.locales.length > 0) {
      translationFilters.push(inArray(productTranslation.locale, params.locales));
    }

    const [variantRows, translationRows] = await Promise.all([
      this.repository.db
        .select({
          variantId: variant.id,
          externalSystem: variant.externalSystem,
          externalId: variant.externalId,
          deletedAt: variant.deletedAt,
        })
        .from(variant)
        .where(and(...variantFilters)),
      this.repository.db
        .select({
          productId: productTranslation.productId,
          locale: productTranslation.locale,
          name: productTranslation.name,
        })
        .from(productTranslation)
        .where(and(...translationFilters)),
    ]);

    return {
      ok: true,
      snapshot: {
        productId: productRow.id,
        productHandle: productRow.handle,
        deletedAt: productRow.deletedAt,
        revision: productRow.revision,
        variants: variantRows,
        translations: translationRows,
      },
    };
  }

  protected handleError(error: unknown): GetInventoryItemProjectionSnapshotResult {
    this.logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to build catalog inventory item projection snapshot"
    );

    return {
      ok: false,
      code: "CATALOG_SNAPSHOT_QUERY_FAILED",
      message: "Failed to build catalog inventory item projection snapshot.",
      retryable: true,
    };
  }
}
