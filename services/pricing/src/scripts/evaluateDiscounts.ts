/**
 * Transaction Script: Discount evaluation for cart
 */

// Import and re-export main function and all public APIs
export {
  evaluateDiscounts,
  // Types and interfaces
  type EvaluateDiscountsResult,
  type DiscountProvider,
  type DiscountValidationRequest,
  type Logger,
  type RequestContext,
  type KernelServices,
  // DTO classes
  LineItemUnitDto,
  LineItemDto,
  EvaluateDiscountsParamsDto,
  // Validation utilities
  isValidDiscountType,
  isValidDiscount,
  createValidated,
  formatValidationErrors,
  validateParams,
  // Domain classes
  CartCalculator,
  DiscountValidator,
  DiscountEvaluationController,
  // Constants
  DISCOUNT_CONSTANTS,
} from "./evaluate-discounts/index.js";
