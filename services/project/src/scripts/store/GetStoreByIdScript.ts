import { BaseScript } from "../../kernel/BaseScript.js";
import type { StorePayload } from "./dto/shared.js";

export interface GetStoreByIdParams {
  id: string;
}

export type GetStoreByIdResult = StorePayload;

export class GetStoreByIdScript extends BaseScript<
  GetStoreByIdParams,
  GetStoreByIdResult
> {
  protected async execute(
    params: GetStoreByIdParams
  ): Promise<GetStoreByIdResult> {
    const { id } = params;

    const store = await this.repository.store.findById(id);

    if (!store) {
      return {
        store: null,
        userErrors: [
          {
            code: "STORE_NOT_FOUND",
            message: `Store with id "${id}" not found`,
            field: null,
          },
        ],
      };
    }

    return {
      store: { ...store, currencyExponent: currencyExponent(store.currencyCode) },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): GetStoreByIdResult {
    return {
      store: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          field: null,
        },
      ],
    };
  }
}

function currencyExponent(currencyCode: string): number {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits;
}
