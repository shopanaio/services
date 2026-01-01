import { BaseScript, type UserError } from "../kernel/BaseScript.js";
import type { inventory as Inventory } from "@shopana/plugin-sdk";

export interface GetOffersParams extends Inventory.GetOffersInput {
  projectId: string;
  requestId: string;
  userAgent?: string;
}

export interface GetOffersResult {
  offers: Inventory.InventoryOffer[];
  warnings?: Array<{ code: string; message: string }>;
  fallbackSource?: string;
}

export class GetOffersScript extends BaseScript<GetOffersParams, GetOffersResult> {
  protected async execute(params: GetOffersParams): Promise<GetOffersResult> {
    // Delegate to `apps.execute` for domain inventory
    const { data, warnings } = await this.services.broker.call("apps.execute", {
      domain: "inventory",
      operation: "getOffers",
      params,
    });

    return {
      offers: data as Inventory.InventoryOffer[],
      warnings,
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
