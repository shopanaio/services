import { and, eq, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  apiKey,
  type ApiKey,
  type NewApiKey,
} from "../models/index.js";

export interface CreateApiKeyData {
  name: string;
  createdById: string;
  dueDate?: Date | null;
}

export class ApiKeyRepository extends BaseRepository {
  // ============ CRUD ============

  async findByProjectId(projectId: string): Promise<ApiKey[]> {
    return this.connection
      .select()
      .from(apiKey)
      .where(
        and(
          eq(apiKey.projectId, projectId),
          isNull(apiKey.deletedAt)
        )
      );
  }

  async findById(id: string): Promise<ApiKey | null> {
    const result = await this.connection
      .select()
      .from(apiKey)
      .where(
        and(
          eq(apiKey.id, id),
          isNull(apiKey.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    const result = await this.connection
      .select()
      .from(apiKey)
      .where(
        and(
          eq(apiKey.key, key),
          isNull(apiKey.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(projectId: string, data: CreateApiKeyData): Promise<ApiKey> {
    const id = randomUUID();
    const now = new Date();

    // Generate a secure random key
    const key = `sk_${randomUUID().replace(/-/g, "")}`;

    const newApiKey: NewApiKey = {
      id,
      projectId,
      name: data.name,
      key,
      createdById: data.createdById,
      dueDate: data.dueDate ?? null,
      isBanned: false,
      createdAt: now,
      deletedAt: null,
    };

    const result = await this.connection
      .insert(apiKey)
      .values(newApiKey)
      .returning();

    return result[0];
  }

  async revoke(id: string): Promise<boolean> {
    const result = await this.connection
      .update(apiKey)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiKey.id, id),
          isNull(apiKey.deletedAt),
          isNull(apiKey.revokedAt)
        )
      )
      .returning({ id: apiKey.id });

    return result.length > 0;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.connection
      .update(apiKey)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(apiKey.id, id),
          isNull(apiKey.deletedAt)
        )
      )
      .returning({ id: apiKey.id });

    return result.length > 0;
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.connection
      .update(apiKey)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKey.id, id));
  }

  async ban(id: string): Promise<boolean> {
    const result = await this.connection
      .update(apiKey)
      .set({ isBanned: true })
      .where(
        and(
          eq(apiKey.id, id),
          isNull(apiKey.deletedAt)
        )
      )
      .returning({ id: apiKey.id });

    return result.length > 0;
  }

  async unban(id: string): Promise<boolean> {
    const result = await this.connection
      .update(apiKey)
      .set({ isBanned: false })
      .where(
        and(
          eq(apiKey.id, id),
          isNull(apiKey.deletedAt)
        )
      )
      .returning({ id: apiKey.id });

    return result.length > 0;
  }

  // ============ Validation ============

  async validateKey(key: string): Promise<ApiKey | null> {
    const apiKeyRecord = await this.findByKey(key);

    if (!apiKeyRecord) return null;
    if (apiKeyRecord.isBanned) return null;
    if (apiKeyRecord.revokedAt) return null;
    if (apiKeyRecord.dueDate && apiKeyRecord.dueDate < new Date()) return null;

    // Update last used timestamp
    await this.updateLastUsed(apiKeyRecord.id);

    return apiKeyRecord;
  }

  // ============ Loader ============

  async getByProjectIds(projectIds: readonly string[]): Promise<ApiKey[]> {
    return this.connection
      .select()
      .from(apiKey)
      .where(
        and(
          inArray(apiKey.projectId, [...projectIds]),
          isNull(apiKey.deletedAt)
        )
      );
  }
}
