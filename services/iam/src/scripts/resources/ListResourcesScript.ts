import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ListResourcesParams,
  ListResourcesResult,
} from "./dto/index.js";
import type {
  ServiceResourceDeclaration,
  FlatResourceDefinition,
  GetResourcesResult,
} from "@shopana/shared-kernel";

/**
 * Services that expose resources via getResources broker action.
 */
const RESOURCE_PROVIDER_SERVICES = ["inventory", "media", "project"] as const;

/**
 * ListResources - Aggregate resources from all services.
 *
 * Queries each service's getResources broker action and aggregates the results.
 * Used by the role editor to display available resources and actions.
 */
export class ListResourcesScript extends BaseScript<
  ListResourcesParams,
  ListResourcesResult
> {
  protected async execute(_params: ListResourcesParams): Promise<ListResourcesResult> {
    const services: ServiceResourceDeclaration[] = [];
    const resources: FlatResourceDefinition[] = [];
    const errors: Array<{ service: string; error: string }> = [];

    // Query each service in parallel
    const results = await Promise.allSettled(
      RESOURCE_PROVIDER_SERVICES.map(async (serviceName) => {
        try {
          const result = await this.services.broker.call<GetResourcesResult>(
            `${serviceName}.getResources`
          );
          return { serviceName, result };
        } catch (error) {
          throw { serviceName, error };
        }
      })
    );

    // Process results
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { result: serviceResources } = result.value;

        if (serviceResources && serviceResources.resources.length > 0) {
          services.push(serviceResources);

          // Create flat resources for easy consumption
          for (const resource of serviceResources.resources) {
            resources.push({
              service: serviceResources.service,
              name: resource.name,
              displayName: resource.displayName,
              actions: resource.actions.map((a) => a.name),
            });
          }
        }
      } else {
        const { serviceName, error } = result.reason as {
          serviceName: string;
          error: unknown;
        };
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.warn(
          { service: serviceName, error: errorMessage },
          "ListResourcesScript: Failed to fetch resources from service"
        );

        errors.push({ service: serviceName, error: errorMessage });
      }
    }

    // Sort services alphabetically
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
      userErrors:
        errors.length > 0
          ? [
              {
                code: "PARTIAL_FAILURE",
                message: `Failed to fetch resources from: ${errors.map((e) => e.service).join(", ")}`,
              },
            ]
          : [],
    };
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
