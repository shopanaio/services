import { CatalogCheckoutActions, type Catalog } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { PricingCatalogMerchandisePort } from "../contracts.js";
import { PricingCheckoutError } from "../errors.js";
import { catalogMerchandiseResultSchema } from "./catalogResult.schema.js";

export class BrokerCatalogMerchandiseAdapter implements PricingCatalogMerchandisePort {
  constructor(private readonly broker: ServiceBroker) {}
  async resolve(params: Catalog.ResolveCheckoutMerchandiseParams): Promise<Catalog.ResolveCheckoutMerchandiseResult> {
    let result: unknown;
    try { result = await this.broker.call(CatalogCheckoutActions.resolveMerchandise, params); }
    catch (error) { throw new PricingCheckoutError("PRICING_CATALOG_UNAVAILABLE", "Catalog merchandise action failed", true, error); }
    const parsed = catalogMerchandiseResultSchema.safeParse(result);
    if (!parsed.success) throw new PricingCheckoutError("PRICING_CATALOG_RESPONSE_INVALID", "Catalog returned an invalid merchandise response", false, parsed.error.flatten());
    return parsed.data;
  }
}
