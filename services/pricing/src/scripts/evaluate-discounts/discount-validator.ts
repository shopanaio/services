/**
 * Discount validator - responsible for checking discount codes and their conditions
 * Applies Single Responsibility principle from SOLID
 *
 * Gets all available discounts from all providers
 * and searches among them for needed promo codes without accessing slots
 */

import type { KernelServices } from "./types.js";
import type { EvaluateDiscountsParamsDto } from "./dto.js";
import type { Discount } from "@shopana/plugin-sdk/pricing";
import { validateDiscount } from "../validateDiscount.js";
import { Money } from "@shopana/shared-money";

/**
 * Discount validator
 */
export class DiscountValidator {
  static async validateDiscounts(
    codes: string[],
    totalAmount: Money,
    services: KernelServices,
    params: EvaluateDiscountsParamsDto
  ): Promise<Discount[]> {
    const { logger } = services;

    if (!codes.length) return [];
    try {
      const validDiscounts: Discount[] = [];
      for (const code of codes) {
        const result = await validateDiscount(
          {
            code,
            projectId: params.projectId,
            requestId: params.requestId,
            userAgent: params.userAgent,
          },
          services
        );

        if (!result.discount) {
          continue;
        }

        // TODO: Implement full validation on plugin level
        const { conditions } = result.discount;
        if (conditions?.minAmount) {
          try {
            // @ts-expect-error TODO: deserialize Money properly
            const minAmount = Money.fromJSON(conditions.minAmount);
            if (totalAmount.lt(minAmount)) {
              continue;
            }
          } catch (error) {
            logger.error(
              { error, conditions },
              "Failed to validate discount conditions"
            );
          }
        }

        validDiscounts.push(result.discount);
      }

      return validDiscounts;
    } catch (error) {
      logger.error({ error, codes }, "Failed to validate discount codes");
      return [];
    }
  }
}
