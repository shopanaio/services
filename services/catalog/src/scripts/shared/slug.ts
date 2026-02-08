export const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}
