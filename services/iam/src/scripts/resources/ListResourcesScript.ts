import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ListResourcesParams,
  ListResourcesResult,
} from "./dto/index.js";
import type {
  ServiceResourceDeclaration,
  FlatResourceDefinition,
} from "@shopana/shared-kernel";

/**
 * ListResources - Aggregate resources from registered resources table.
 *
 * Resources are registered by services via iam.registerResources broker action.
 * This script fetches from the local database instead of querying each service.
 */
export class ListResourcesScript extends BaseScript<
  ListResourcesParams,
  ListResourcesResult
> {
  protected async execute(_params: ListResourcesParams): Promise<ListResourcesResult> {
    const resources: FlatResourceDefinition[] = [];
    const services: ServiceResourceDeclaration[] = [];
    const serviceMap = new Map<string, ServiceResourceDeclaration>();

    try {
      // Get all registered resources from database
      const registeredResources = await this.repository.resource.getAllResources();

      // Build resources and services lists
      for (const r of registeredResources) {
        // Add to flat resources list
        resources.push({
          service: r.service,
          name: r.name,
          displayName: r.displayName ?? r.name,
          actions: r.actions,
        });

        // Group by service for ServiceResourceDeclaration
        if (!serviceMap.has(r.service)) {
          serviceMap.set(r.service, {
            service: r.service,
            displayName: r.service.charAt(0).toUpperCase() + r.service.slice(1),
            resources: [],
          });
        }
        const serviceDecl = serviceMap.get(r.service)!;
        serviceDecl.resources.push({
          name: r.name,
          displayName: r.displayName ?? r.name,
          actions: r.actions.map((a) => ({ name: a, displayName: a })),
        });
      }

      // Convert service map to array
      for (const service of serviceMap.values()) {
        services.push(service);
      }

      // Sort alphabetically
      services.sort((a, b) => a.displayName.localeCompare(b.displayName));
      resources.sort((a, b) => {
        if (a.service !== b.service) {
          return a.service.localeCompare(b.service);
        }
        return a.displayName.localeCompare(b.displayName);
      });

      return {
        services,
        resources,
        userErrors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: errorMessage },
        "ListResourcesScript: Failed to fetch registered resources"
      );

      return {
        services: [],
        resources: [],
        userErrors: [
          {
            code: "FETCH_FAILED",
            message: "Failed to fetch registered resources",
          },
        ],
      };
    }
  }

  protected handleError(error: unknown): ListResourcesResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error(
      { error: errorMessage },
      "ListResourcesScript: Unexpected error"
    );

    return {
      services: [],
      resources: [],
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while listing resources",
        },
      ],
    };
  }
}
