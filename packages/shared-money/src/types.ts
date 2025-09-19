import type { Currency as CurrencyType } from "@dinero.js/currencies";
import type * as Core from "@dinero.js/core";

/** Dinero instance parameterized with bigint amount type. */
export type BigintDinero = Core.Dinero<bigint>;
/** Currency type where amount/base/exponent are represented as bigint. */
export type MoneyCurrency = CurrencyType<bigint>;
/** Exchange rates type bound to bigint (reserved for future use). */
export type MoneyRates = Core.Rates<bigint>;

/** JSON-safe currency snapshot: all potential BigInt values represented as strings. */
type CurrencySnapshot = Readonly<{
  code: string;
  base: string | readonly string[];
  exponent: string;
}>;

/** JSON-safe Money snapshot: all potential BigInt values represented as strings. */
export type MoneySnapshot = Readonly<
  {
    amount: string;
    scale: string;
    currency: CurrencySnapshot;
  } & { __brand?: "MoneySnapshot" }
>;
