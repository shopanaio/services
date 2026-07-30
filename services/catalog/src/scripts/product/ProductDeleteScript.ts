import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  BackRefNotifyInput,
  EntityDeletedNotifyInput,
} from "../../sagas/index.js";
import type { ProductDeleteParams, ProductDeleteResult } from "./dto/index.js";

export class ProductDeleteScript extends BaseScript<
  ProductDeleteParams,
  ProductDeleteResult
> {
  protected async execute(
    params: ProductDeleteParams
  ): Promise<ProductDeleteResult> {
    const result = await this.deleteProduct(params);

    if (result.userErrors.length === 0 && result.deletedProductId) {
      if (params.permanent) {
        await this.notifyProductDeleted(result.deletedProductId);
      } else {
        await this.clearProductBackRefs(result.deletedProductId);
      }
    }

    return result;
  }

  @Transactional()
  private async deleteProduct(
    params: ProductDeleteParams
  ): Promise<ProductDeleteResult> {
    const { id, permanent = false } = params;

    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        deletedProductId: undefined,
        categoryIds: [],
        revision: undefined,
        deletedAt: undefined,
        userErrors: [
          { message: "Product not found", field: ["id"], code: "NOT_FOUND" },
        ],
      };
    }

    const categoryLinks =
      await this.repository.category.getProductCategoryLinks(id);
    const categoryIds = [
      ...new Set(categoryLinks.map((link) => link.categoryId)),
    ];

    const deletedAt = new Date().toISOString();
    const deleted = permanent
      ? await this.repository.product.hardDelete(id)
      : await this.repository.product.softDeleteWithRevision(id);

    if (!deleted) {
      return {
        deletedProductId: undefined,
        categoryIds,
        revision: undefined,
        deletedAt: undefined,
        userErrors: [
          { message: "Failed to delete product", code: "DELETE_FAILED" },
        ],
      };
    }

    this.logger.info({ productId: id, permanent }, "Product deleted");

    const revision =
      typeof deleted === "boolean" ? existingProduct.revision + 1 : deleted.revision;
    const effectiveDeletedAt =
      typeof deleted === "boolean" ? deletedAt : deleted.deletedAt ?? deletedAt;

    return {
      deletedProductId: id,
      categoryIds,
      revision,
      deletedAt: effectiveDeletedAt,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductDeleteResult {
    return {
      deletedProductId: undefined,
      categoryIds: [],
      revision: undefined,
      deletedAt: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private async notifyProductDeleted(productId: string): Promise<void> {
    try {
      await this.services.broker.runSaga<unknown, EntityDeletedNotifyInput>(
        "entityDeletedNotify",
        {
          entityRef: {
            service: "catalog",
            entityType: "product",
            entityId: productId,
          },
        },
        {
          source: "workflow",
          workflowId: `productDelete:${productId}`,
          stepId: "notifyProductDeleted",
        }
      );
    } catch (error) {
      this.logger.warn(
        { productId, error },
        "Failed to notify media about deleted product"
      );
    }
  }

  private async clearProductBackRefs(productId: string): Promise<void> {
    try {
      await this.services.broker.runSaga<unknown, BackRefNotifyInput>(
        "catalog.backRefNotify",
        {
          entityRef: {
            service: "catalog",
            entityType: "product",
            entityId: productId,
          },
          storeId: this.getProjectId(),
          fileIds: [],
        },
        {
          source: "workflow",
          workflowId: `productDelete:${productId}`,
          stepId: "clearProductBackRefs",
        }
      );
    } catch (error) {
      this.logger.warn(
        { productId, error },
        "Failed to clear product media back-refs"
      );
    }
  }
}
