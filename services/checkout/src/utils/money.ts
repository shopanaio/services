import { Money } from "@shopana/shared-money";

export function _coerceMoney(value: unknown): Money {
  if (value instanceof Money) return value;
  if (
    value &&
    typeof value === "object" &&
    "minor" in (value as any) &&
    "scale" in (value as any)
  ) {
    try {
      return Money.fromJSON(value as any);
    } catch {
      // fallthrough
    }
  }
  if (typeof value === "bigint") return Money.fromMinor(value);
  if (typeof value === "number" || typeof value === "string") {
    try {
      return Money.fromMinor(BigInt(String(value)));
    } catch {
      return Money.zero();
    }
  }
  return Money.zero();
}

export function coerceNullableMoney(value: unknown): Money | null {
  if (value == null) return null;
  const m = coerceMoney(value);
  return m;
}

export function coerceMoney(value: unknown): Money {
  if (value instanceof Money) return value;
  if (value && typeof value === "object") {
    try {
      return Money.fromJSON(value as any);
    } catch {
      // fallthrough
    }
  }
  if (typeof value === "bigint") return Money.fromMinor(value);
  if (typeof value === "number" || typeof value === "string") {
    try {
      return Money.fromMinor(BigInt(String(value)));
    } catch {
      return Money.zero();
    }
  }
  return Money.zero();
}
