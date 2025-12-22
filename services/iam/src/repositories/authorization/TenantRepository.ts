import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { tenant } from "../models/authorization.js";
import type { Database } from "../../db/database.js";
import type { Tenant } from "../models/authorization.js";

/**
 * Repository for managing tenants in PostgreSQL.
 *
 * Note: Slug and display name are stored in project service (project.project table).
 * IAM only stores tenant record for authorization purposes.
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
   * Create a new tenant with UUIDv7
   */
  async create(): Promise<Tenant> {
    const id = uuidv7();
    const [result] = await this.db
      .insert(tenant)
      .values({ id })
      .returning();
    return result;
  }

  /**
   * Delete tenant
   */
  async delete(id: string): Promise<boolean> {
    await this.db.delete(tenant).where(eq(tenant.id, id));
    return true;
  }
}
