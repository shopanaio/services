import { z } from "zod";
import { pricing as PricingSDK } from "@shopana/plugin-sdk";
import { configSchema } from "./index";
import { Money } from "@shopana/shared-money";

type Config = z.infer<typeof configSchema>;

/**
 * Simple promo discount provider
 */
export class SimplePromoPricingProvider implements PricingSDK.PricingProvider {
  constructor(
    private readonly ctx: PricingSDK.ProviderContext,
    private readonly cfg: Config,
  ) {}

  pricing = {
    list: async (): Promise<PricingSDK.Discount[]> => {
      this.ctx.logger.info("Getting simple promo discounts");

      // Simple promo discounts
      const promoDiscounts: PricingSDK.Discount[] = [
        {
          code: "WELCOME10",
          type: PricingSDK.DiscountType.PERCENTAGE,
          value: 10,
          provider: "simple-promo",
          conditions: {
            minAmount: Money.fromMinor(100n * 100n, "USD"),
          },
        },
        {
          code: "SAVE50",
          type: PricingSDK.DiscountType.PERCENTAGE,
          value: 50,
          provider: "simple-promo",
          conditions: {
            minAmount: Money.fromMinor(300n * 100n, "USD"),
          },
        },
      ];

      // Filter by config settings
      let filteredDiscounts = promoDiscounts;

      // Filter by enabled discount types
      if (this.cfg.enabledTypes && this.cfg.enabledTypes.length > 0) {
        filteredDiscounts = filteredDiscounts.filter((d) =>
          this.cfg.enabledTypes!.includes(d.type),
        );
      }

      return filteredDiscounts;
    },

    /**
     * Validate discount by code
     */
    validate: async (
      code: string,
    ): Promise<{ valid: boolean; discount?: PricingSDK.Discount }> => {
      this.ctx.logger.info("Validating discount code", { code });

      // Get all available discounts
      const allDiscounts = await this.pricing.list();

      // Search for discount by code (case-insensitive)
      const discount = allDiscounts.find(
        (d) => d.code.toLowerCase() === code.toLowerCase(),
      );

      if (!discount) {
        this.ctx.logger.warn("Discount code not found", { code });
        return {
          valid: false,
        };
      }

      return {
        valid: true,
        discount,
      };
    }
  } as const;
}
