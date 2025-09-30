import type { Discount } from '@shopana/plugin-sdk/pricing';

export type FallbackResult = {
  discounts: Discount[];
  source: 'slot.data.discounts' | 'empty' | 'emergency';
  warnings: Array<{ code: string; message: string }>;
};

export function buildFallbackFromSlot(slotData: Record<string, unknown> | undefined): FallbackResult {
  const warnings: Array<{ code: string; message: string }> = [];
  const discounts = Array.isArray((slotData as any)?.discounts)
    ? ((slotData as any).discounts as Discount[])
    : [];
  if (discounts.length === 0) {
    warnings.push({ code: 'FALLBACK_DATA_EMPTY', message: 'No discounts in slot.data.discounts' });
    return { discounts: [], source: 'empty', warnings };
  }
  warnings.push({ code: 'FALLBACK_DATA_USED', message: 'Using cached discounts from slot.data.discounts' });
  return { discounts, source: 'slot.data.discounts', warnings };
}

export function buildEmergencyFallback(): FallbackResult {
  return {
    discounts: [],
    source: 'emergency',
    warnings: [{ code: 'EMERGENCY_FALLBACK', message: 'Emergency fallback used' }],
  };
}
