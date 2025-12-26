import type { ServiceBroker, ServiceResourceDeclaration, ResourceDefinition, ResourceScope } from "@shopana/shared-kernel";
import { IAM_SERVICE_RESOURCES, CACHE_TTL } from "../constants/rbac.js";

/**
 * List of services that expose resources via getResources broker action.
 * IAM queries each service and aggregates all resources.
 */
const RESOURCE_SERVICES = ["project", "inventory", "media"] as const;

/**
 * ResourceAggregator - aggregates resources from all services via broker.
 *
 * Instead of IAM knowing about all resources, each service registers its
 * resources via getResources broker action. IAM queries all services
 * and caches the aggregated result.
 */
export class ResourceAggregator {
  private cache: ServiceResourceDeclaration[] | null = null;
  private cacheExpiry: number = 0;

  constructor(private readonly broker: ServiceBroker) {}

  /**
   * Get all resources from all services.
   * Results are cached for CACHE_TTL.RESOURCES milliseconds.
   */
  async getAllResources(): Promise<ServiceResourceDeclaration[]> {
    const now = Date.now();

    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    const resources: ServiceResourceDeclaration[] = [IAM_SERVICE_RESOURCES];

    // Query each service in parallel - each returns an array of declarations
    const results = await Promise.allSettled(
      RESOURCE_SERVICES.map((service) =>
        this.broker.call<ServiceResourceDeclaration[]>(`${service}.getResources`)
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        resources.push(...result.value);
      }
    }

    // Cache the results
    this.cache = resources;
    this.cacheExpiry = now + CACHE_TTL.RESOURCES;

    return resources;
  }

  /**
   * Get flat list of all resources for a specific scope.
   * Used by MembershipResolver.availableResources().
   *
   * @param scope - "organization" or "store"
   */
  async getResourcesForScope(scope: ResourceScope): Promise<ResourceDefinition[]> {
    const allResources = await this.getAllResources();

    return allResources
      .filter((s) => s.scope === scope)
      .flatMap((s) => s.resources);
  }

  /**
   * Get flat list of all resources for a specific domain.
   * Used by MembershipResolver.availableResources().
   *
   * @param domain - "org" for organization resources, "store:{id}" for store resources
   */
  async getResourcesForDomain(domain: string): Promise<ResourceDefinition[]> {
    const scope: ResourceScope = domain === "org" ? "organization" : "store";
    return this.getResourcesForScope(scope);
  }

  /**
   * Invalidate the cache (e.g., when services are updated).
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}
