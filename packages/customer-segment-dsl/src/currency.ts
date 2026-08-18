export function currencyMinorUnitDigits(currencyCode: string): number {
  const digits = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).resolvedOptions().maximumFractionDigits;

  if (typeof digits !== "number" || !Number.isInteger(digits) || digits < 0 || digits > 6) {
    throw new Error(`Unsupported minor-unit digits for ${currencyCode}`);
  }
  return digits;
}
