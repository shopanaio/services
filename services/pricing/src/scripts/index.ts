import type { EvaluateDiscountsParamsDto } from "./evaluateDiscounts.js";
// Export all transaction scripts
export {
  getAllDiscounts,
  type GetAllDiscountsParams,
  type GetAllDiscountsResult,
} from "./getAllDiscounts";

export {
  validateDiscount,
  type ValidateDiscountParams,
  type ValidateDiscountResult,
} from "./validateDiscount";

export {
  evaluateDiscounts,
  // DiscountProviderNotFoundError - not used in new logic
  // Public type for input parameters (raw shape from API)
  type EvaluateDiscountsParamsDto,
  type EvaluateDiscountsResult,
} from "./evaluateDiscounts";
// For external consumers leave alias for DTO
export type EvaluateDiscountsParams = EvaluateDiscountsParamsDto;
