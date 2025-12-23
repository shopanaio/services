import type {
  ServiceResourceDeclaration,
  FlatResourceDefinition,
} from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Parameters for ListResources script.
 * Currently empty - fetches all resources from all services.
 */
export interface ListResourcesParams {
  // Future: could add filters like serviceNames?: string[]
}

/**
 * Result of ListResources script.
 */
export interface ListResourcesResult {
  /** Aggregated resources grouped by service */
  services: ServiceResourceDeclaration[];
  /** Flat list of resources for easy consumption */
  resources: FlatResourceDefinition[];
  /** Any errors that occurred */
  userErrors: UserError[];
}
