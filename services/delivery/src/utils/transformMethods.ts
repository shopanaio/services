import type { ShippingMethod } from "@shopana/plugin-sdk/shipping";

/**
 * Returns shipping methods unchanged preserving separation of provider and code.
 *
 * We keep `method.code` as the pure method identifier (e.g. "doors_doors")
 * and expose provider separately via `method.provider`.
 */
export function transformMethodCodes(methods: ShippingMethod[]): ShippingMethod[] {
  return methods;
}
