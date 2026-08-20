export function mapById<T extends { id: string }>(
  ids: readonly string[],
  rows: readonly T[],
): Array<T | null> {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => rowsById.get(id) ?? null);
}

export function groupByKey<T>(
  keys: readonly string[],
  rows: readonly T[],
  getKey: (row: T) => string,
): T[][] {
  const rowsByKey = new Map<string, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    const group = rowsByKey.get(key);
    if (group) {
      group.push(row);
    } else {
      rowsByKey.set(key, [row]);
    }
  }
  return keys.map((key) => rowsByKey.get(key) ?? []);
}
