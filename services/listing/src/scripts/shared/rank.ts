const RANK_WIDTH = 20;
const RANK_MIN = 0n;
const RANK_MAX = (10n ** BigInt(RANK_WIDTH)) - 1n;
const DEFAULT_STEP = 1_000_000_000_000n;
const DEFAULT_MIDDLE = RANK_MAX / 2n;

function clamp(value: bigint): bigint {
  if (value < RANK_MIN) return RANK_MIN;
  if (value > RANK_MAX) return RANK_MAX;
  return value;
}

export function encodeRank(value: bigint): string {
  return clamp(value).toString().padStart(RANK_WIDTH, "0");
}

export function decodeRank(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid rank: "${value}"`);
  }
  return clamp(BigInt(normalized));
}

export function initialRank(): string {
  return encodeRank(DEFAULT_MIDDLE);
}

export function nextRank(afterRank: string): string {
  return encodeRank(decodeRank(afterRank) + DEFAULT_STEP);
}

export function previousRank(beforeRank: string): string {
  return encodeRank(decodeRank(beforeRank) - DEFAULT_STEP);
}

export function midpointRank(afterRank?: string | null, beforeRank?: string | null): string | null {
  if (!afterRank && !beforeRank) {
    return initialRank();
  }

  if (afterRank && beforeRank) {
    const left = decodeRank(afterRank);
    const right = decodeRank(beforeRank);
    if (left >= right - 1n) {
      return null;
    }
    return encodeRank((left + right) / 2n);
  }

  if (afterRank) {
    const left = decodeRank(afterRank);
    if (left >= RANK_MAX - 1n) {
      return null;
    }
    return encodeRank(left + DEFAULT_STEP);
  }

  const right = decodeRank(beforeRank!);
  if (right <= RANK_MIN + 1n) {
    return null;
  }
  return encodeRank(right - DEFAULT_STEP);
}

export function rebalanceRanks(total: number): string[] {
  if (total <= 0) {
    return [];
  }

  const gap = RANK_MAX / BigInt(total + 1);
  const ranks: string[] = [];
  for (let i = 1; i <= total; i++) {
    ranks.push(encodeRank(gap * BigInt(i)));
  }
  return ranks;
}
