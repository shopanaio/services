import { z } from "zod";
import {
  shipping as ShippingSDK,
  payment as PaymentSDK,
} from "@shopana/plugin-sdk";
import { NovaPoshtaClient } from "./client";
import { configSchema } from "./index";

type Config = z.infer<typeof configSchema>;

export class NovaPoshtaProvider implements ShippingSDK.ShippingProvider {
  private readonly client: NovaPoshtaClient;

  constructor(ctx: ShippingSDK.ProviderContext, private readonly cfg: Config) {
    const http = ctx.createHttp("");
    this.client = new NovaPoshtaClient(http, cfg.apiKey);
  }

  shipping = {
    list: async (): Promise<ShippingSDK.ShippingMethod[]> => {
      return [
        {
          deliveryMethodType: ShippingSDK.DeliveryMethodType.SHIPPING,
          shippingPaymentModel:
            ShippingSDK.ShippingPaymentModel.MERCHANT_COLLECTED,
          code: "warehouse_warehouse",
          provider: "novaposhta",
        },
        {
          code: "warehouse_doors",
          provider: "novaposhta",
          deliveryMethodType: ShippingSDK.DeliveryMethodType.SHIPPING,
          shippingPaymentModel:
            ShippingSDK.ShippingPaymentModel.MERCHANT_COLLECTED,
        },
      ];
    },
  } as const;

  payment = {
    list: async (
      _input?: PaymentSDK.ListPaymentMethodsInput
    ): Promise<PaymentSDK.PaymentMethod[]> => {
      const methods: PaymentSDK.PaymentMethod[] = [
        {
          code: "cod_cash",
          provider: "novaposhta",
          flow: PaymentSDK.PaymentFlow.ON_DELIVERY,
          metadata: {},
          constraints: {
            shippingMethodCodes: [
              "novaposhta:warehouse_warehouse",
              "novaposhta:warehouse_doors",
            ],
          },
        },
      ];
      return methods;
    },
  } as const;
}
