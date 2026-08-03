import { and, asc, eq, isNull } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import {
  mediaSources,
  files,
  type MediaSource,
  type NewMediaSource,
} from "./models/index.js";

export interface MediaSourceInput {
  mediaFileId: string;
  sourceFileId: string;
  kind: string;
  format: string;
  sortOrder?: number;
}

export class MediaSourceRepository {
  constructor(private readonly db: Database) {}

  async find(
    mediaFileId: string,
    sourceFileId: string
  ): Promise<MediaSource | null> {
    const rows = await this.db
      .select()
      .from(mediaSources)
      .where(
        and(
          eq(mediaSources.mediaFileId, mediaFileId),
          eq(mediaSources.sourceFileId, sourceFileId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findBySlot(
    mediaFileId: string,
    kind: string,
    sortOrder: number
  ): Promise<MediaSource | null> {
    const rows = await this.db
      .select()
      .from(mediaSources)
      .where(
        and(
          eq(mediaSources.mediaFileId, mediaFileId),
          eq(mediaSources.kind, kind),
          eq(mediaSources.sortOrder, sortOrder)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getByMediaFileId(mediaFileId: string): Promise<MediaSource[]> {
    const rows = await this.db
      .select({ source: mediaSources })
      .from(mediaSources)
      .innerJoin(files, eq(files.id, mediaSources.sourceFileId))
      .where(
        and(
          eq(mediaSources.mediaFileId, mediaFileId),
          isNull(files.deletedAt)
        )
      )
      .orderBy(
        asc(mediaSources.kind),
        asc(mediaSources.sortOrder),
        asc(mediaSources.sourceFileId)
      );
    return rows.map((row) => row.source);
  }

  async getReferencingMediaFileIds(sourceFileId: string): Promise<string[]> {
    const rows = await this.db
      .select({ mediaFileId: mediaSources.mediaFileId })
      .from(mediaSources)
      .where(eq(mediaSources.sourceFileId, sourceFileId));
    return rows.map((row) => row.mediaFileId);
  }

  async create(input: MediaSourceInput): Promise<MediaSource> {
    const rows = await this.db
      .insert(mediaSources)
      .values({ ...input, sortOrder: input.sortOrder ?? 0 })
      .returning();
    return rows[0];
  }

  async update(
    mediaFileId: string,
    sourceFileId: string,
    input: Partial<Pick<NewMediaSource, "kind" | "format" | "sortOrder">>
  ): Promise<MediaSource | null> {
    const rows = await this.db
      .update(mediaSources)
      .set(input)
      .where(
        and(
          eq(mediaSources.mediaFileId, mediaFileId),
          eq(mediaSources.sourceFileId, sourceFileId)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(mediaFileId: string, sourceFileId: string): Promise<boolean> {
    const rows = await this.db
      .delete(mediaSources)
      .where(
        and(
          eq(mediaSources.mediaFileId, mediaFileId),
          eq(mediaSources.sourceFileId, sourceFileId)
        )
      )
      .returning({ sourceFileId: mediaSources.sourceFileId });
    return rows.length > 0;
  }
}
