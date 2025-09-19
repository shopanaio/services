import * as Core from "@dinero.js/core";
import type { Currency as CurrencyType } from "@dinero.js/currencies";
import * as Currencies from "@dinero.js/currencies";
import BigintCalc from "@dinero.js/calculator-bigint";
import { BigintDinero, MoneyCurrency, MoneySnapshot } from "types";

const { calculator: rawBigintCalculator } = BigintCalc;
const bigintCalculator = {
  ...rawBigintCalculator,
  power: (base: bigint, exponent: bigint) => base ** exponent,
};

/**
 * Factory for creating Dinero<bigint> objects.
 * Guarantees that amount and (optionally) scale are passed as bigint.
 *
 * Note about scale:
 * - By default equals currency exponent (e.g., USD → 2, JPY → 0).
 * - Can set higher scale for intermediate calculations with increased precision,
 *   then normalize to unified scale via normalizeScale.
 */
const makeDinero = Core.createDinero<bigint>({
  calculator: bigintCalculator,
  onCreate: ({ amount, scale }) => {
    if (typeof amount !== "bigint")
      throw new Error("Money amount must be a bigint (minor units).");
    if (scale !== undefined && typeof scale !== "bigint")
      throw new Error("Money scale must be a bigint when provided.");
  },
});

/**
 * Converts Currency with numeric fields to Currency with bigint.
 * If input is already bigint - returns as is.
 *
 * @example
 * ```ts
 * const usdNumber: Currency<number> = USD;
 * const usdBigint = currencyToBigint(usdNumber); // Currency<bigint>
 * ```
 */
function currencyToBigint(
  cur: CurrencyType<number> | MoneyCurrency,
): MoneyCurrency {
  if (
    (cur as MoneyCurrency).exponent &&
    typeof (cur as MoneyCurrency).exponent === "bigint"
  ) {
    return cur as MoneyCurrency;
  }
  const base = Array.isArray(cur.base)
    ? (cur.base as readonly number[]).map((v) => BigInt(v))
    : BigInt(cur.base as number);
  return {
    code: cur.code,
    base,
    exponent: BigInt(cur.exponent),
  };
}

/**
 * Converts multiplier/ratio to bigint or to scaled format expected by Dinero.
 * Accepts number | bigint | { amount, scale } (both in number|bigint),
 * returns bigint or { amount, scale } with bigint.
 *
 * @example
 * ```ts
 * toBigintScaledAmount(3)        // 3n
 * toBigintScaledAmount(3n)       // 3n
 * toBigintScaledAmount({ amount: 15, scale: 2 }) // { amount: 15n, scale: 2n }
 * ```
 */
function toBigintScaledAmount(
  factor:
    | number
    | bigint
    | { amount: number | bigint; scale?: number | bigint },
): bigint | { amount: bigint; scale?: bigint } {
  if (typeof factor === "bigint") return factor;
  if (typeof factor === "number") return BigInt(factor);
  return {
    amount:
      typeof factor.amount === "bigint" ? factor.amount : BigInt(factor.amount),
    scale:
      factor.scale === undefined
        ? undefined
        : typeof factor.scale === "bigint"
          ? factor.scale
          : BigInt(factor.scale),
  };
}

// Predefined Dinero core operations related to bigint calculator
const addFn = Core.safeAdd(bigintCalculator);
const subFn = Core.safeSubtract(bigintCalculator);
const mulFn = Core.multiply(bigintCalculator);
const cmpFn = Core.safeCompare(bigintCalculator);
const gtFn = Core.safeGreaterThan(bigintCalculator);
const gteFn = Core.safeGreaterThanOrEqual(bigintCalculator);
const ltFn = Core.safeLessThan(bigintCalculator);
const lteFn = Core.safeLessThanOrEqual(bigintCalculator);
const minFn = Core.safeMinimum(bigintCalculator);
const maxFn = Core.safeMaximum(bigintCalculator);
const isZeroFn = Core.isZero(bigintCalculator);
const isPositiveFn = Core.isPositive(bigintCalculator);
const isNegativeFn = Core.isNegative(bigintCalculator);
const normalizeScaleFn = Core.normalizeScale(bigintCalculator);
const transformScaleFn = Core.transformScale(bigintCalculator);
const toDecimalFn = Core.toDecimal(bigintCalculator);

/**
 * Money Value Object based on Dinero v2 with minor units in bigint.
 *
 * - Immutable: all operations return new instances.
 * - Minor units: `amountMinor` returns raw bigint (e.g., cents for USD).
 * - No formatting and currency conversion — only value operations.
 */
export class Money {
  private readonly value: BigintDinero;

  /** Creates Money from Dinero<bigint> value. */
  private constructor(value: BigintDinero) {
    this.value = value;
  }

  /**
   * Creates Money from minor units.
   *
   * - amountMinor: integer in minor units (bigint), e.g., 199n for $1.99 in USD.
   * - currency: Dinero currency descriptor; number fields will be converted to bigint.
   * - scale: optional precision scale (bigint) beyond currency exponent.
   *
   * @example
   * ```ts
   * const price = Money.fromMinor(199n, "USD");
   * ```
   */
  static fromMinor(
    amountMinor: bigint,
    currencyCode: string = "USD",
    scale?: bigint,
  ): Money {
    const code = currencyCode.toUpperCase();
    const currencyNumber = (Currencies as Record<string, CurrencyType<number>>)[
      code
    ];
    if (!currencyNumber) {
      throw new Error(`Unsupported currency code: ${currencyCode}`);
    }
    const cur = currencyToBigint(currencyNumber);
    const d = makeDinero({ amount: amountMinor, currency: cur, scale });
    return new Money(d);
  }

  /**
   * Returns minimum of provided Money values.
   * @example
   * ```ts
   * const a = Money.fromMinor(100n, "USD");
   * const b = Money.fromMinor(250n, "USD");
   * Money.min(a, b).amountMinor() // 100n
   * ```
   */
  static min(...values: Money[]): Money {
    return new Money(minFn(values.map((v) => v.value)));
  }

  /**
   * Returns maximum of provided Money values.
   * @example
   * ```ts
   * const a = Money.fromMinor(100n, "USD");
   * const b = Money.fromMinor(250n, "USD");
   * Money.max(a, b).amountMinor() // 250n
   * ```
   */
  static max(...values: Money[]): Money {
    return new Money(maxFn(values.map((v) => v.value)));
  }

  /**
   * Serializes value to JSON-safe snapshot (strings instead of BigInt).
   * Compatible in format with DineroSnapshot, but numeric fields are strings.
   */
  toJSON(): MoneySnapshot {
    const snap = this.value.toJSON();
    return {
      amount: snap.amount.toString(),
      scale: snap.scale.toString(),
      currency: {
        code: snap.currency.code,
        base: Array.isArray(snap.currency.base)
          ? (snap.currency.base as readonly bigint[]).map((v) => v.toString())
          : (snap.currency.base as bigint).toString(),
        exponent: snap.currency.exponent.toString(),
      },
    };
  }

  /**
   * Restores Money from snapshot.
   * Supports both old BigInt Dinero snapshot and new JSON-safe MoneySnapshot.
   */
  static fromJSON(
    snapshot: MoneySnapshot | Core.DineroSnapshot<bigint>,
  ): Money {
    const s: any = snapshot as any;
    // New format: strings
    if (typeof s.amount === "string") {
      const currencyBaseRaw = s.currency.base as string | readonly string[];
      const currency: MoneyCurrency = {
        code: s.currency.code as string,
        base: Array.isArray(currencyBaseRaw)
          ? (currencyBaseRaw as readonly string[]).map((v) => BigInt(v))
          : BigInt(currencyBaseRaw as string),
        exponent: BigInt(s.currency.exponent as string),
      };
      return new Money(
        makeDinero({
          amount: BigInt(s.amount as string),
          currency,
          scale: BigInt(s.scale as string),
        }),
      );
    }
    // Old format: BigInt
    return new Money(
      makeDinero({
        amount: s.amount as bigint,
        currency: s.currency as MoneyCurrency,
        scale: s.scale as bigint,
      }),
    );
  }

  /** Returns currency descriptor (as bigint). */
  currency(): MoneyCurrency {
    return this.value.toJSON().currency as MoneyCurrency;
  }

  /** Returns amount in minor units as bigint. */
  amountMinor(): bigint {
    return this.value.toJSON().amount as bigint;
  }

  /**
   * Adds two Money values (same currency/scale), returns new Money.
   * @example
   * ```ts
   * const a = Money.fromMinor(150n, "USD");
   * const b = Money.fromMinor(50n, "USD");
   * a.add(b).amountMinor() // 200n
   * ```
   */
  add(other: Money): Money {
    return new Money(addFn(this.value, other.value));
  }

  /** Subtracts another Money (same currency/scale), returns new Money. */
  subtract(other: Money): Money {
    return new Money(subFn(this.value, other.value));
  }

  /**
   * Multiplies amount by factor: number, bigint or scaled amount
   * `{ amount, scale }`. Returns new Money.
   *
   * @example
   * ```ts
   * const a = Money.fromMinor(100n, "USD");
   * a.multiply(3).amountMinor()                      // 300n
   * a.multiply({ amount: 15, scale: 2 }).amountMinor() // *1.5 → 150n
   * ```
   */
  multiply(
    factor:
      | number
      | bigint
      | { amount: number | bigint; scale?: number | bigint },
  ): Money {
    return new Money(mulFn(this.value, toBigintScaledAmount(factor)));
  }

  /** Compares with another Money. Returns -1, 0 or 1. */
  compare(other: Money): -1 | 0 | 1 {
    return cmpFn(this.value, other.value) as -1 | 1 | 0;
  }

  /** Equality check. */
  eq(other: Money): boolean {
    return this.compare(other) === Core.ComparisonOperator.EQ;
  }

  /** "Greater than" check. */
  gt(other: Money): boolean {
    return gtFn(this.value, other.value);
  }

  /** "Greater than or equal" check. */
  gte(other: Money): boolean {
    return gteFn(this.value, other.value);
  }

  /** "Less than" check. */
  lt(other: Money): boolean {
    return ltFn(this.value, other.value);
  }

  /** "Less than or equal" check. */
  lte(other: Money): boolean {
    return lteFn(this.value, other.value);
  }

  /** True if amount equals zero. */
  isZero(): boolean {
    return isZeroFn(this.value);
  }

  /** True if amount is strictly positive. */
  isPositive(): boolean {
    return isPositiveFn(this.value);
  }

  /** True if amount is strictly negative. */
  isNegative(): boolean {
    return isNegativeFn(this.value);
  }

  /**
   * Normalizes scale to maximum among provided values (here — itself).
   * Useful after multiplications by scaled multipliers.
   */
  normalizeScale(): Money {
    const [v] = normalizeScaleFn([this.value]);
    return new Money(v);
  }

  /** Returns currency zero. */
  static zero(currency: string = "USD"): Money {
    return Money.fromMinor(0n, currency);
  }

  /**
   * Returns value in major units with rounding to digits decimal places.
   * By default digits = currency exponent, rounding — banking (half-even).
   * Returns decimal string (without precision loss for large BigInt).
   */
  toRoundedUnit(roundingMode: Core.DivideOperation = Core.halfEven): string {
    const snap = this.value.toJSON();

    const rounded = transformScaleFn(
      this.value,
      snap.currency.exponent,
      roundingMode,
    );

    return toDecimalFn(rounded) as string;
  }
}
