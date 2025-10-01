import { z } from "zod";
import { payment as PaymentSDK } from "@shopana/plugin-sdk";
import { configSchema } from "./index";

type Config = z.infer<typeof configSchema>;

/**
 * Bank Transfer payment provider
 * Provides offline payment method where customers pay via bank transfer
 */
export class BankTransferPaymentProvider implements PaymentSDK.PaymentProvider {
  constructor(
    private readonly ctx: PaymentSDK.ProviderContext,
    private readonly cfg: Config
  ) {}

  payment = {
    list: async (
      input?: PaymentSDK.ListPaymentMethodsInput
    ): Promise<PaymentSDK.PaymentMethod[]> => {
      this.ctx.logger.info("Getting bank transfer payment methods", { input });

      // Check if currency is supported
      if (
        input?.currency &&
        !this.cfg.supportedCurrencies.includes(input.currency)
      ) {
        this.ctx.logger.warn("Currency not supported", {
          currency: input.currency,
        });
        return [];
      }

      const paymentMethod: PaymentSDK.PaymentMethod = {
        code: "bank_transfer",
        provider: "bank_transfer",
        flow: PaymentSDK.PaymentFlow.OFFLINE,
        metadata: {},
        constraints: {
          shippingMethodCodes: [],
        },
      };

      return [paymentMethod];
    },
  };
}
