export function searchSettingsCacheKey(storeId: string): string {
  return `search:settings:${storeId}`;
}

export function searchSynonymsCacheKey(storeId: string, locale: string): string {
  return `search:synonyms:${storeId}:${locale}`;
}

export function searchProductBoostCacheKey(
  storeId: string,
  locale: string,
  boostId: string,
): string {
  return `search:boost:${storeId}:${locale}:${boostId}`;
}
