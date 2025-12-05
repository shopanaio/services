import { eq, and, isNull, sql } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { buckets, type Bucket, type NewBucket } from "./models";
import { config } from "../config.js";

export interface CreateBucketInput {
  id?: string;
  bucketName: string;
  region?: string;
  status?: string;
  priority?: number;
  endpointUrl?: string | null;
}

export class BucketRepository {
  constructor(private readonly db: Database) {}

  async findById(projectId: string, bucketId: string): Promise<Bucket | null> {
    const result = await this.db
      .select()
      .from(buckets)
      .where(
        and(
          eq(buckets.projectId, projectId),
          eq(buckets.id, bucketId),
          isNull(buckets.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findActive(projectId: string): Promise<Bucket | null> {
    const result = await this.db
      .select()
      .from(buckets)
      .where(
        and(
          eq(buckets.projectId, projectId),
          eq(buckets.status, "active"),
          isNull(buckets.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(projectId: string, data: CreateBucketInput): Promise<Bucket> {
    const id = data.id ?? crypto.randomUUID();

    const newBucket: NewBucket = {
      id,
      projectId,
      bucketName: data.bucketName,
      region: data.region ?? "us-east-1",
      status: data.status ?? "active",
      priority: data.priority ?? 0,
      endpointUrl: data.endpointUrl ?? null,
    };

    const result = await this.db.insert(buckets).values(newBucket).returning();

    return result[0];
  }

  /**
   * Get or create a default bucket for the project using config values.
   * If an active bucket exists, returns it.
   * If no active bucket, creates one from config and marks old ones as archived.
   */
  async getOrCreateDefault(projectId: string): Promise<Bucket> {
    // Try to find existing active bucket
    const existing = await this.findActive(projectId);
    if (existing) {
      return existing;
    }

    // Archive any existing buckets for this project
    await this.db
      .update(buckets)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(buckets.projectId, projectId),
          eq(buckets.status, "active"),
          isNull(buckets.deletedAt)
        )
      );

    // Create new bucket from config
    return this.create(projectId, {
      bucketName: config.storage.bucket,
      region: config.storage.region ?? "us-east-1",
      endpointUrl: config.storage.endpoint,
      status: "active",
      priority: 0,
    });
  }
}
