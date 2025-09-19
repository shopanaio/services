import { z } from "zod";
import {
  type ShippingProvider,
  type ProviderContext,
  type ShippingMethod,
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-sdk";
import { NovaPoshtaClient } from "./client";
import { configSchema } from "./index";

type Config = z.infer<typeof configSchema>;

export class NovaPoshtaProvider implements ShippingProvider {
  private readonly client: NovaPoshtaClient;

  constructor(
    ctx: ProviderContext,
    private readonly cfg: Config,
  ) {
    const http = ctx.createHttp(cfg.baseUrl);
    this.client = new NovaPoshtaClient(http, cfg.apiKey);
  }

  async getMethods(): Promise<ShippingMethod[]> {
    const mock: ShippingMethod[] = [
      {
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
        code: "warehouse_warehouse",
        provider: "novaposhta",
      },
      {
        code: "warehouse_doors",
        provider: "novaposhta",
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
      },
      {
        code: "doors_warehouse",
        provider: "novaposhta",
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
      },
      {
        code: "doors_doors",
        provider: "novaposhta",
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
      },
    ];

    return mock;
  }
}
