import { z } from "zod";
import type {
  PricingProvider,
  ProviderContext,
  Discount,
} from "@shopana/pricing-plugin-kit";
import { DiscountType } from "@shopana/pricing-plugin-kit";
import { configSchema } from "./index";
import { Money } from "@shopana/money";

type Config = z.infer<typeof configSchema>;

/**
 * Simple promo discount provider
 */
export class SimplePromoPricingProvider implements PricingProvider {
  constructor(
    private readonly ctx: ProviderContext,
    private readonly cfg: Config,
  ) {}

  async getDiscounts(): Promise<Discount[]> {
    this.ctx.logger.info("Getting simple promo discounts");

    // Simple promo discounts
    const promoDiscounts: Discount[] = [
      {
        code: "WELCOME10",
        type: DiscountType.PERCENTAGE,
        value: 10,
        provider: "simple-promo",
        conditions: {
          minAmount: Money.fromMinor(100n * 100n, "USD"),
        },
      },
      {
        code: "SAVE50",
        type: DiscountType.PERCENTAGE,
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
  }

  /**
   * Validate discount by code
   */
  async validateDiscount(
    code: string,
  ): Promise<{ valid: boolean; discount?: Discount }> {
    this.ctx.logger.info("Validating discount code", { code });

    // Get all available discounts
    const allDiscounts = await this.getDiscounts();

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
}
