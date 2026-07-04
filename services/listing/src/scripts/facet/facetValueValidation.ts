import { isValidSlug } from "../shared/slug.js";

export function normalizeFacetValueHandle(handle: string): string {
  return handle.trim();
}

function normalizeFacetType(facetType: string): string {
  return facetType.toUpperCase();
}

export function isFacetWithValues(facetType: string): boolean {
  const normalizedType = normalizeFacetType(facetType);
  return normalizedType !== "PRICE" && normalizedType !== "IN_STOCK";
}

export function isValidDisplayHandle(handle: string): boolean {
  return isValidSlug(handle);
}

export function isValidSourceHandle(
  facetType: string,
  handle: string
): boolean {
  const normalizedType = normalizeFacetType(facetType);
  if (normalizedType === "TAG") {
    return isValidSlug(handle);
  }

  if (normalizedType !== "FEATURE" && normalizedType !== "OPTION") {
    return false;
  }

  const parts = handle.split(":");
  return parts.length === 2 && parts.every((part) => isValidSlug(part));
}
