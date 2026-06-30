import { isValidSlug } from "../shared/slug.js";

export function normalizeFacetValueHandle(handle: string): string {
  return handle.trim();
}

export function isFacetWithValues(facetType: string): boolean {
  return facetType !== "price" && facetType !== "in_stock";
}

export function isValidDisplayHandle(handle: string): boolean {
  return isValidSlug(handle);
}

export function isValidSourceHandle(
  facetType: string,
  handle: string
): boolean {
  if (facetType === "tag") {
    return isValidSlug(handle);
  }

  if (facetType !== "feature" && facetType !== "option") {
    return false;
  }

  const parts = handle.split(":");
  return parts.length === 2 && parts.every((part) => isValidSlug(part));
}
