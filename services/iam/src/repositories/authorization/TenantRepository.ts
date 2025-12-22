import { eq } from "drizzle-orm";
import { tenant } from "../models/authorization.js";
import type { Database } from "../../db/database.js";
import type { Tenant } from "../models/authorization.js";

/**
 * Repository for managing tenants in PostgreSQL.
 *
 * Note: Tenant ID equals Project ID from project service.
 * Slug and display name are stored in project.project table.
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
   * Check if tenant exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== null;
  }

  /**
   * Create a new tenant with specified ID (same as project ID)
   */
  async create(id: string): Promise<Tenant> {
    const [result] = await this.db
      .insert(tenant)
      .values({ id })
      .returning();
    return result;
  }

  /**
   * Get or create tenant by ID
   */
  async getOrCreate(id: string): Promise<Tenant> {
    const existing = await this.findById(id);
    if (existing) {
      return existing;
    }
    return this.create(id);
  }

  /**
   * Delete tenant
   */
  async delete(id: string): Promise<boolean> {
    await this.db.delete(tenant).where(eq(tenant.id, id));
    return true;
  }
}
