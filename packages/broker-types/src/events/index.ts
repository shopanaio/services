/**
 * Broker event types - organized by service
 *
 * Events are returned from workflows and emitted via runWorkflow.
 */

import type { EntityRef } from "../shared.js";

// ============================================================================
// Media Events
// ============================================================================

export namespace MediaEvents {
  /** Emitted when a file is soft-deleted */
  export interface FileSoftDeleted {
    fileId: string;
    assetGroupId: string;
    deletedAt: string;
  }

  /** Emitted when a file is hard-deleted */
  export interface FileHardDeleted {
    fileId: string;
  }
}

// ============================================================================
// Inventory Events
// ============================================================================

export namespace InventoryEvents {
  /** Emitted when a product is created */
  export interface ProductCreated {
    productId: string;
    storeId: string;
  }

  /** Emitted when a product is deleted */
  export interface ProductDeleted {
    productId: string;
    storeId: string;
    categoryIds?: string[];
  }

  /** Emitted when entity is deleted and needs cleanup */
  export interface EntityDeleted {
    entityRef: EntityRef;
  }
}

// ============================================================================
// IAM Events
// ============================================================================

export namespace IAMEvents {
  /** Emitted when an organization is created */
  export interface OrganizationCreated {
    organizationId: string;
    userId: string;
  }

  /** Emitted when an organization is deleted */
  export interface OrganizationDeleted {
    organizationId: string;
  }
}

// ============================================================================
// Project Events
// ============================================================================

export namespace ProjectEvents {
  /** Emitted when a store is created */
  export interface StoreCreated {
    storeId: string;
    organizationId: string;
  }

  /** Emitted when a store is deleted */
  export interface StoreDeleted {
    storeId: string;
    organizationId: string;
  }
}
