import { z } from "zod";
import {
  type ShippingProvider,
  type ProviderContext,
  type ShippingMethod,
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-sdk";
import { type PaymentMethod, type GetPaymentMethodsInput, PaymentFlow } from "@shopana/payment-plugin-sdk";
import { NovaPoshtaClient } from "./client";
import { configSchema } from "./index";

type Config = z.infer<typeof configSchema>;

export class NovaPoshtaProvider implements ShippingProvider {
  private readonly client: NovaPoshtaClient;

  constructor(ctx: ProviderContext, private readonly cfg: Config) {
    const http = ctx.createHttp(cfg.baseUrl);
    this.client = new NovaPoshtaClient(http, cfg.apiKey);
  }

  async getMethods(): Promise<ShippingMethod[]> {
    return [
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
    ];
  }

  async getPaymentMethods(input?: GetPaymentMethodsInput): Promise<PaymentMethod[]> {
    // For Nova Poshta, common payment on delivery options are COD (cash) and POS at branch/courier.
    // We expose them as two distinct methods. Filtering by shippingMethodCode is not needed here.
    const methods: PaymentMethod[] = [
      {
        code: "cod_cash",
        provider: "novaposhta",
        name: "Cash on Delivery",
        description: "Pay cash to courier or at branch upon delivery",
        paymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
        flow: PaymentFlow.ON_DELIVERY,
        metadata: { instrument: "CASH" },
      },
      {
        code: "cod_card",
        provider: "novaposhta",
        name: "Card on Delivery",
        description: "Pay by card to courier or at branch upon delivery",
        paymentModel: ShippingPaymentModel.MERCHANT_COLLECTED,
        flow: PaymentFlow.ON_DELIVERY,
        metadata: { instrument: "CARD" },
      },
    ];

    // If amount limits are provided, we could filter unsupported amounts in the future.
    return methods;
  }
}
