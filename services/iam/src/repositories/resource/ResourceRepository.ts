import { eq, and } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import {
  registeredResource,
  type RegisteredResource,
  type NewRegisteredResource,
} from "../models/authorization.js";

export interface ResourceDefinition {
  service: string;
  name: string;
  displayName?: string;
  actions: string[];
}

export class ResourceRepository {
  constructor(private readonly db: Database) {}

  async register(
    service: string,
    resources: Array<{ name: string; displayName?: string; actions: string[] }>
  ): Promise<void> {
    // Upsert each resource
    for (const resource of resources) {
      const existing = await this.db
        .select()
        .from(registeredResource)
        .where(
          and(
            eq(registeredResource.service, service),
            eq(registeredResource.name, resource.name)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await this.db
          .update(registeredResource)
          .set({
            displayName: resource.displayName,
            actions: JSON.stringify(resource.actions),
            updatedAt: new Date(),
          })
          .where(eq(registeredResource.id, existing[0].id));
      } else {
        // Insert new
        await this.db.insert(registeredResource).values({
          service,
          name: resource.name,
          displayName: resource.displayName,
          actions: JSON.stringify(resource.actions),
        });
      }
    }
  }

  async getAllResources(): Promise<ResourceDefinition[]> {
    const results = await this.db.select().from(registeredResource);
    return results.map((r) => ({
      service: r.service,
      name: r.name,
      displayName: r.displayName ?? undefined,
      actions: JSON.parse(r.actions) as string[],
    }));
  }

  async getResourcesByService(service: string): Promise<ResourceDefinition[]> {
    const results = await this.db
      .select()
      .from(registeredResource)
      .where(eq(registeredResource.service, service));
    return results.map((r) => ({
      service: r.service,
      name: r.name,
      displayName: r.displayName ?? undefined,
      actions: JSON.parse(r.actions) as string[],
    }));
  }

  async unregisterService(service: string): Promise<void> {
    await this.db
      .delete(registeredResource)
      .where(eq(registeredResource.service, service));
  }
}
