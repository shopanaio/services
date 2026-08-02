import type { Catalog, Pricing } from "@shopana/broker-types";

export function componentUnitPrice(base: bigint, rule: Catalog.CheckoutComponentPriceRuleSnapshot | null): bigint {
  if (!rule || rule.strategy === "BASE") return base;
  if (rule.strategy === "FREE") return 0n;
  if (rule.strategy === "OVERRIDE") return BigInt(rule.amount.amountMinor);
  const delta = rule.value.type === "FIXED_AMOUNT" ? BigInt(rule.value.amount.amountMinor) : base * BigInt(rule.value.percentageBps) / 10_000n;
  return rule.operation === "INCREASE" ? base + delta : base > delta ? base - delta : 0n;
}

export function money(amount: bigint, currencyCode: string): Pricing.PricingCheckoutMoney { if (amount < 0n) throw new RangeError("Money cannot be negative"); return { amountMinor: amount.toString(), currencyCode }; }
