import { shipping as ShippingSDK } from "@shopana/plugin-sdk";
// Payment-related methods are no longer exposed from shipping provider
import { MeestExpressClient } from "./client";
import { configSchema } from "./index";
import { z } from "zod";

type Config = z.infer<typeof configSchema>;

export class MeestExpressProvider implements ShippingSDK.ShippingProvider {
  private readonly client: MeestExpressClient;

  constructor(
    private readonly ctx: ShippingSDK.ProviderContext,
    private readonly cfg: Config
  ) {
    const http = ctx.createHttp("");
    this.client = new MeestExpressClient(http, cfg.apiKey);
  }

  shipping = {
    list: async (): Promise<ShippingSDK.ShippingMethod[]> => {
      const mock: ShippingSDK.ShippingMethod[] = [
        {
          code: "warehouse_warehouse",
          provider: "meest",
          deliveryMethodType: ShippingSDK.DeliveryMethodType.SHIPPING,
          shippingPaymentModel:
            ShippingSDK.ShippingPaymentModel.MERCHANT_COLLECTED,
        },
        {
          deliveryMethodType: ShippingSDK.DeliveryMethodType.SHIPPING,
          shippingPaymentModel:
            ShippingSDK.ShippingPaymentModel.MERCHANT_COLLECTED,
          code: "warehouse_doors",
          provider: "meest",
        },
        {
          deliveryMethodType: ShippingSDK.DeliveryMethodType.SHIPPING,
          shippingPaymentModel:
            ShippingSDK.ShippingPaymentModel.MERCHANT_COLLECTED,
          code: "doors_warehouse",
          provider: "meest",
        },
        {
          deliveryMethodType: ShippingSDK.DeliveryMethodType.SHIPPING,
          shippingPaymentModel:
            ShippingSDK.ShippingPaymentModel.MERCHANT_COLLECTED,
          code: "doors_doors",
          provider: "meest",
        },
      ];
      return mock;
    },
  } as const;

  // No payment listing here; use dedicated payment plugin instead
}
