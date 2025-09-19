/**
 * Transaction Script: Discount evaluation for cart
 * Main entry point for discount evaluation module
 */

import type { TransactionScript } from "@src/kernel/types";
import type {
  EvaluateDiscountsResult,
  KernelServices,
} from "./types.js";
import type { EvaluateDiscountsParamsDto } from "./dto.js";
import { DiscountEvaluationController } from "./discount-evaluation-controller.js";

/**
 * Transaction Script: Discount evaluation for cart
 *
 * @param params - Parameters for discount evaluation (cart, discount codes, etc.)
 * @param services - Injected core services
 * @returns Applied discounts for cart and individual items
 *
 */
export const evaluateDiscounts: TransactionScript<
  EvaluateDiscountsParamsDto,
  EvaluateDiscountsResult
> = async (
  params: EvaluateDiscountsParamsDto,
  services: KernelServices,
) => {
  return DiscountEvaluationController.evaluate(params, services);
};

// Re-export all public types and interfaces
export type {
  EvaluateDiscountsResult,
  DiscountProvider,
  DiscountValidationRequest,
  Logger,
  RequestContext,
  KernelServices,
} from "./types.js";

// Re-export DTO classes for validation
export {
  LineItemUnitDto,
  LineItemDto,
  EvaluateDiscountsParamsDto,
} from "./dto.js";

// Re-export validation utilities
export {
  isValidDiscountType,
  isValidDiscount,
  createValidated,
  formatValidationErrors,
  validateParams,
} from "./validation.js";

// Re-export domain classes
export { CartCalculator } from "./cart-calculator.js";
export { DiscountValidator } from "./discount-validator.js";
export { DiscountEvaluationController } from "./discount-evaluation-controller.js";

// Re-export constants
export { DISCOUNT_CONSTANTS } from "./types.js";
