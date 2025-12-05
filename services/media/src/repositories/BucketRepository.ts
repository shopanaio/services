import { eq, and, isNull } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import { buckets, type Bucket, type NewBucket } from "./models";

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
}
