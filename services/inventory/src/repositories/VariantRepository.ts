import { and, eq } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import { variant, type Variant } from "./models";

export class VariantRepository extends BaseRepository {
  /**
   * Find variant by ID
   */
  async findById(id: string): Promise<Variant | null> {
    const result = await this.db
      .select()
      .from(variant)
      .where(and(eq(variant.projectId, this.projectId), eq(variant.id, id)))
      .limit(1);

    return result[0] ?? null;
  }
}
