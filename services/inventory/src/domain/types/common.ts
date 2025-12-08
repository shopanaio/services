/**
 * Common domain types
 */

/**
 * Audit timestamps
 */
export interface Timestamps {
  /** The date and time when the entity was created */
  createdAt: Date;
  /** The date and time when the entity was last updated */
  updatedAt: Date;
}

/**
 * Soft-deletable entity
 */
export interface SoftDeletable {
  /** The date and time when the entity was deleted (soft delete) */
  deletedAt: Date | null;
}

/**
 * Information about pagination in a connection
 */
export interface PageInfo {
  /** When paginating forwards, are there more items? */
  hasNextPage: boolean;
  /** When paginating backwards, are there more items? */
  hasPreviousPage: boolean;
  /** When paginating backwards, the cursor to continue */
  startCursor: string | null;
  /** When paginating forwards, the cursor to continue */
  endCursor: string | null;
}

/**
 * A generic user error for mutation responses
 */
export interface UserError {
  /** The error message */
  message: string;
  /** The path to the input field that caused the error */
  field: string[] | null;
  /** An error code for programmatic handling */
  code: string | null;
}

/**
 * Generic connection type for pagination
 */
export interface Connection<T> {
  /** A list of edges */
  edges: Edge<T>[];
  /** Information to aid in pagination */
  pageInfo: PageInfo;
  /** The total number of items */
  totalCount: number;
}

/**
 * Generic edge type for pagination
 */
export interface Edge<T> {
  /** The item at the end of the edge */
  node: T;
  /** A cursor for use in pagination */
  cursor: string;
}
