import { Discount } from "@shopana/pricing-plugin-kit";

/**
 * Result of discount evaluation
 */
export interface EvaluateDiscountsResult {
  /** Discounts applied to the entire cart */
  checkoutDiscounts: Discount[];

  /** Discounts applied to individual cart items (not yet supported) */
  lineDiscounts: Record<string, Discount[]>;
}

/**
 * Information about discount provider and its configuration
 */
export interface DiscountProvider {
  /** Discount provider code */
  provider: string;

  /** Provider configuration */
  config: Record<string, unknown>;
}

/**
 * Request for discount validation through plugin
 */
export interface DiscountValidationRequest {
  /** Code of discount provider plugin */
  pluginCode: string;

  /** Raw plugin configuration */
  rawConfig: Record<string, unknown>;

  /** Discount code for validation */
  code: string;

  /** Project identifier */
  projectId: string;

  /** Request metadata */
  requestMeta?: {
    /** Request identifier */
    requestId?: string;

    /** Client User-Agent */
    userAgent?: string;
  };
}

/**
 * Logger interface
 */
export interface Logger {
  /** Information message */
  info: (meta: Record<string, unknown>, message: string) => void;

  /** Warning */
  warn: (meta: Record<string, unknown>, message: string) => void;

  /** Error */
  error: (meta: Record<string, unknown>, message: string) => void;
}

/**
 * Request context for correlation and tracing
 */
export interface RequestContext {
}

// Using types from core system
export type { KernelServices } from "@src/kernel/types";

/**
 * Discount system constants
 */
export const DISCOUNT_CONSTANTS = {
  /** Empty discount evaluation result for fallback cases */
  EMPTY_RESULT: {
    checkoutDiscounts: [],
    lineDiscounts: {},
  } as EvaluateDiscountsResult,
} as const;
