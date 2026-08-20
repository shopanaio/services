import { CatalogCheckoutActions, type Catalog } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { DeliveryCheckoutFactsPort } from "../../checkout-pipeline/contracts.js";

export class BrokerDeliveryCheckoutFactsAdapter implements DeliveryCheckoutFactsPort {
  constructor(private readonly broker: ServiceBroker) {}

  async resolve(
    params: Catalog.ResolveCheckoutDeliveryFactsParams,
  ): Promise<Catalog.ResolveCheckoutDeliveryFactsResult> {
    const result = await this.broker.call<
      Catalog.ResolveCheckoutDeliveryFactsResult,
      Catalog.ResolveCheckoutDeliveryFactsParams
    >(CatalogCheckoutActions.resolveDeliveryFacts, params);
    if (!result || typeof result !== "object" || !("ok" in result))
      throw new Error("Catalog returned an invalid delivery facts envelope");
    return result;
  }
}
