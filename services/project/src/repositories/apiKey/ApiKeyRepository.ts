import { and, eq, inArray, isNull } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";
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

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  rawKey: string;
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

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const result = await this.connection
      .select()
      .from(apiKey)
      .where(
        and(
          eq(apiKey.keyHash, keyHash),
          isNull(apiKey.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(projectId: string, data: CreateApiKeyData): Promise<CreateApiKeyResult> {
    const id = randomUUID();
    const now = new Date();

    // Generate a secure random key
    const rawKey = `sk_${randomUUID().replace(/-/g, "")}`;
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const newApiKey: NewApiKey = {
      id,
      projectId,
      name: data.name,
      keyHash,
      keyPrefix,
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

    return {
      apiKey: result[0],
      rawKey,
    };
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

  async validateKey(rawKey: string): Promise<ApiKey | null> {
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const key = await this.findByKeyHash(keyHash);

    if (!key) return null;
    if (key.isBanned) return null;
    if (key.revokedAt) return null;
    if (key.dueDate && key.dueDate < new Date()) return null;

    // Update last used timestamp
    await this.updateLastUsed(key.id);

    return key;
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
