/**
 * Cart calculator - responsible for cart-related calculations
 * Applies Information Expert pattern from GRASP
 */

import { Money } from "@shopana/money";
import type { LineItemDto } from "./dto.js";

/**
 * Cart calculator
 */
export class CartCalculator {
  /**
   * Calculates total cart cost
   * @param lines - Cart items (validated DTOs)
   * @returns Total amount in minor currency units
   * @example
   * ```typescript
   * const validatedLines = [new LineItemDto()]; // validated data
   * const total = CartCalculator.calculateTotal(validatedLines); // 2000n
   * ```
   */
  static calculateTotal(lines: LineItemDto[]): Money {
    // TODO: use currency from project
    const initial =
      lines.length > 0
        ? Money.zero(lines[0].unit.price.currency().code)
        : Money.zero();
    return lines.reduce((sum, line) => {
      const lineTotal = line.unit.price.multiply(line.quantity);
      return sum.add(lineTotal);
    }, initial);
  }
}
