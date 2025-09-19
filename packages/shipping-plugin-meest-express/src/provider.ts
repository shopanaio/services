import {
  type ShippingProvider,
  type ProviderContext,
  type ShippingMethod,
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-sdk";
import { MeestExpressClient } from "./client";
import { configSchema } from "./index";
import { z } from "zod";

type Config = z.infer<typeof configSchema>;

export class MeestExpressProvider implements ShippingProvider {
  private readonly client: MeestExpressClient;

  constructor(
    private readonly ctx: ProviderContext,
    private readonly cfg: Config,
  ) {
    const http = ctx.createHttp(cfg.baseUrl);
    this.client = new MeestExpressClient(http, cfg.apiKey);
  }

  async getMethods(): Promise<ShippingMethod[]> {
    const mock: ShippingMethod[] = [
      {
        code: "warehouse_warehouse",
        provider: "meest",
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
      },
      {
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
        code: "warehouse_doors",
        provider: "meest",
      },
      {
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
        code: "doors_warehouse",
        provider: "meest",
      },
      {
        deliveryMethodType: DeliveryMethodType.SHIPPING,
        shippingPaymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
        code: "doors_doors",
        provider: "meest",
      },
    ];
    return mock;
  }
}
