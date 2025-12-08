/**
 * Media domain types - matches GraphQL schema
 */

/**
 * Media attached to a variant with sort order
 */
export interface VariantMediaItem {
  /** UUID of the file from the Media service */
  fileId: string;
  /** Sort order index (lower = first) */
  sortIndex: number;
}
