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
