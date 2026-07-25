import { BaseScript, type UserError } from "../kernel/BaseScript.js";
import type {
  GetOffersInput,
  InventoryOffer,
} from "@shopana/shared-service-api";

export interface GetOffersParams extends GetOffersInput {
  storeId: string;
  requestId: string;
  userAgent?: string;
}

export interface GetOffersResult {
  offers: InventoryOffer[];
  warnings?: Array<{ code: string; message: string }>;
  fallbackSource?: string;
}

export class GetOffersScript extends BaseScript<GetOffersParams, GetOffersResult> {
  protected async execute(params: GetOffersParams): Promise<GetOffersResult> {
    // Route inventory work through the installed hosted App capability.
    const result = (await this.services.broker.call("apps.executeCapability", {
      storeId: params.storeId,
      capability: "inventory",
      operation: "getOffers",
      input: params,
    })) as { data: InventoryOffer[] };

    return {
      offers: result.data,
      fallbackSource: undefined,
    };
  }

  protected handleError(error: unknown): GetOffersResult {
    this.logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Critical error in GetOffersScript"
    );

    return {
      offers: [],
      warnings: [
        {
          code: "CRITICAL_ERROR",
          message: "Critical error occurred while retrieving inventory offers",
        },
      ],
      fallbackSource: "error",
    };
  }
}
