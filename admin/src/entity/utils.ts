export const sanitizeEntries = <T>(
  entries: void | null | (T | null)[],
): T[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter(
    (entry) => entry !== null && entry !== undefined,
  ) as T[];
};

export const sortEntriesById = <T extends { id: ID }>(entries: T[]): T[] => {
  return [...entries].sort((a, b) => {
    return a.id.localeCompare(b.id);
  });
};
