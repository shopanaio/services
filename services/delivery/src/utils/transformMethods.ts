import type { ShippingMethod } from "@shopana/shipping-plugin-sdk";

/**
 * Transforms delivery methods by adding provider prefix to method code.
 *
 * Changes code format from "warehouse_warehouse" to "novaposhta:warehouse_warehouse"
 *
 * @param methods - Array of delivery methods
 * @returns Array of methods with transformed codes
 */
export function transformMethodCodes(methods: ShippingMethod[]): ShippingMethod[] {
  return methods.map(method => ({
    ...method,
    code: `${method.provider}:${method.code}`
  }));
}
