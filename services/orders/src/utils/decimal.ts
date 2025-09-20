export type IntegerDecimal = { amount: string; scale: number };

export function isIntegerDecimal(value: unknown): value is IntegerDecimal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'amount' in value &&
    'scale' in value &&
    typeof (value as any).amount === 'string' &&
    typeof (value as any).scale === 'number'
  );
}

/**
 * Parses string/number or object into integer decimal representation { amount, scale }.
 * Returns null if input is incorrect.
 */
export function parseDecimalInput(input: unknown): IntegerDecimal | null {
  if (input == null) return null;
  if (isIntegerDecimal(input)) return input;
  const asString =
    typeof input === 'number' ? String(input) : typeof input === 'string' ? input : null;
  if (asString == null) return null;
  const trimmed = asString.trim();
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const negative = trimmed.startsWith('-');
  const unsigned = trimmed.replace(/^[-+]/, '');
  const [intPartRaw, fracPartRaw = ''] = unsigned.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '');
  const fracPart = fracPartRaw.replace(/0+$/, '');
  const scale = fracPart.length;
  const digits = (intPart + fracPart).replace(/^0+(?=\d)/, '') || '0';
  const amount = (negative && digits !== '0' ? '-' : '') + digits;
  return { amount, scale };
}
