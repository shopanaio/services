import { BaseScript } from "../../../kernel/BaseScript.js";

export type CategoryUpdateReadScriptQuery =
  | Readonly<{ type: "exists"; categoryId: string }>
  | Readonly<{ type: "handleOwner"; handle: string }>
  | Readonly<{ type: "directProfileId"; categoryId: string }>
  | Readonly<{ type: "affectedProductIds"; categoryId: string }>;

export type CategoryUpdateReadScriptResult =
  | Readonly<{ type: "exists"; result: boolean }>
  | Readonly<{ type: "handleOwner"; result: string | null }>
  | Readonly<{ type: "directProfileId"; result: string | null }>
  | Readonly<{ type: "affectedProductIds"; result: readonly string[] }>;

export class CategoryUpdateReadScript extends BaseScript<
  CategoryUpdateReadScriptQuery,
  CategoryUpdateReadScriptResult
> {
  protected async execute(
    query: CategoryUpdateReadScriptQuery,
  ): Promise<CategoryUpdateReadScriptResult> {
    switch (query.type) {
      case "exists":
        return {
          type: query.type,
          result: (await this.repository.category.findById(query.categoryId)) !== null,
        };
      case "handleOwner":
        return {
          type: query.type,
          result: (await this.repository.category.findByHandle(query.handle))?.id ?? null,
        };
      case "directProfileId":
        return {
          type: query.type,
          result:
            (
              await this.repository.comparisonRead.getDirectProfilesByCategoryIds([
                query.categoryId,
              ])
            )[0]?.profileId ?? null,
        };
      case "affectedProductIds":
        return {
          type: query.type,
          result: (await this.repository.category.getOrderedCategoryProducts(query.categoryId)).map(
            (item) => item.productId,
          ),
        };
      default:
        return assertNever(query);
    }
  }

  protected handleError(error: unknown): CategoryUpdateReadScriptResult {
    throw error;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported category mutation read query: ${JSON.stringify(value)}`);
}
