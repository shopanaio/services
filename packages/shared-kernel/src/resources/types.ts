/**
 * Resource scope determines where the resource is available.
 * - "organization": Organization-level resources (members, roles, billing)
 * - "store": Store-level resources (products, orders, inventory)
 */
export type ResourceScope = "organization" | "store";

/**
 * Resource action types.
 * Each resource can have a subset of these standard actions.
 */
export type ResourceAction = string;

/**
 * Resource definition exposed by a service.
 *
 * @example
 * {
 *   name: "product",
 *   displayName: "Products",
 *   description: "Product catalog management",
 *   actions: [
 *     { name: "create", displayName: "Create", description: "Create new products" },
 *     { name: "read", displayName: "View", description: "View product details" },
 *   ]
 * }
 */
export interface ResourceActionDefinition {
  /** Action identifier, e.g., "create", "read", "update" */
  name: string;
  /** Human-readable display name, e.g., "Create", "View" */
  displayName: string;
  /** Optional description of what this action allows */
  description?: string;
}

export interface ResourceDefinition {
  /** Resource identifier, e.g., "product", "order", "project.settings" */
  name: string;
  /** Human-readable display name, e.g., "Products", "Orders" */
  displayName: string;
  /** Optional description of the resource */
  description?: string;
  /** Available actions for this resource */
  actions: ResourceActionDefinition[];
}

/**
 * Service resource declaration returned by getResources broker action.
 * Each service exposes its resources and available actions.
 */
export interface ServiceResourceDeclaration {
  /** Service identifier, e.g., "inventory", "orders", "project" */
  service: string;
  /** Service display name for UI */
  displayName: string;
  /** Scope where these resources are available */
  scope: ResourceScope;
  /** List of resources exposed by this service */
  resources: ResourceDefinition[];
}

/**
 * Parameters for getResources broker action.
 * Currently empty - returns all resources.
 */
export type GetResourcesParams = void;

/**
 * Result of getResources broker action.
 * Returns array of declarations - one per scope the service supports.
 */
export type GetResourcesResult = ServiceResourceDeclaration[];

/**
 * Aggregated resources from all services.
 * Used by IAM service to display available resources in role editor.
 */
export interface AggregatedResources {
  services: ServiceResourceDeclaration[];
}

/**
 * Flat resource definition for GraphQL API.
 * Combines service name with resource definition.
 */
export interface FlatResourceDefinition {
  /** Service that owns this resource */
  service: string;
  /** Resource name */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Available action names for this resource */
  actions: string[];
}
