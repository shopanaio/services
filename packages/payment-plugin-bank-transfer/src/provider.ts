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
      code: "bank-transfer",
      provider: "bank-transfer",
      flow: PaymentSDK.PaymentFlow.OFFLINE,
      metadata: {},
      constraints: {
        shippingMethodCodes: [],
      },
    };

      return [paymentMethod];
    }
  } as const;

  /**
   * Generate payment instructions for bank transfer
   */
  private generatePaymentInstructions(): string {
    const baseInstructions = `
Payment Details:

Bank: ${this.cfg.bankName}
Account Holder: ${this.cfg.accountHolder}
Account Number: ${this.cfg.accountNumber}
Routing Number: ${this.cfg.routingNumber}

IMPORTANT:
1. Please include your order number in the payment reference
2. Keep your payment receipt and send it to us for confirmation
3. Payment processing may take 1-3 business days
4. Contact support if you have any questions
    `.trim();

    if (this.cfg.instructions) {
      return `${baseInstructions}\n\nAdditional Instructions:\n${this.cfg.instructions}`;
    }

    return baseInstructions;
  }
}
