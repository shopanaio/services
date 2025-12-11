/**
 * Product interface types - simple value types only
 * Main Product type is derived from ProductResolver in derived.ts
 */

/**
 * Product description in multiple formats
 */
export interface Description {
  /** Plain text description */
  text: string;
  /** HTML description */
  html: string;
  /** EditorJS JSON description */
  json: unknown;
}
