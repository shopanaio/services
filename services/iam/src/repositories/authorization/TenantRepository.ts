import { eq } from "drizzle-orm";
import { tenant } from "../../db/schema/authorization.js";
import type { Database } from "../../db/database.js";
import type { Tenant, NewTenant } from "../../db/schema/authorization.js";

export interface CreateTenantInput {
  slug: string;
  name: string;
}

/**
 * Repository for managing tenants in PostgreSQL
 */
export class TenantRepository {
  constructor(private readonly db: Database) {}

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<Tenant | null> {
    const [result] = await this.db
      .select()
      .from(tenant)
      .where(eq(tenant.id, id));
    return result ?? null;
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    const [result] = await this.db
      .select()
      .from(tenant)
      .where(eq(tenant.slug, slug));
    return result ?? null;
  }

  /**
   * Create a new tenant
   */
  async create(input: CreateTenantInput): Promise<Tenant> {
    const [result] = await this.db
      .insert(tenant)
      .values({
        slug: input.slug,
        name: input.name,
      })
      .returning();
    return result;
  }

  /**
   * Update tenant
   */
  async update(id: string, updates: Partial<CreateTenantInput>): Promise<Tenant | null> {
    const [result] = await this.db
      .update(tenant)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tenant.id, id))
      .returning();
    return result ?? null;
  }

  /**
   * Delete tenant
   */
  async delete(id: string): Promise<boolean> {
    await this.db.delete(tenant).where(eq(tenant.id, id));
    return true;
  }

  /**
   * Check if tenant exists by slug
   */
  async existsBySlug(slug: string): Promise<boolean> {
    const result = await this.findBySlug(slug);
    return result !== null;
  }

  /**
   * Get or create tenant by slug
   */
  async getOrCreate(slug: string, name?: string): Promise<Tenant> {
    const existing = await this.findBySlug(slug);
    if (existing) {
      return existing;
    }
    return this.create({ slug, name: name ?? slug });
  }
}
