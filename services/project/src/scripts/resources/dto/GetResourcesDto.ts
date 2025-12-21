export interface ResourceType {
  /** Resource name, e.g., "product", "order", "project.settings" */
  name: string;
  /** Available actions, e.g., ["read", "write", "delete"] */
  actions: string[];
  /** Optional scope modifiers, e.g., ["own", "all"] */
  scopes?: string[];
}

export interface ServiceResourceDefinition {
  /** Service name, e.g., "project", "inventory", "orders" */
  service: string;
  /** List of resources exposed by this service */
  resources: ResourceType[];
}

// GetResources takes no parameters - it returns static resource definitions
export type GetResourcesParams = void;

export type GetResourcesResult = ServiceResourceDefinition;
