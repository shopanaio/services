import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { vendor, type Vendor } from "../models/index.js";

export class VendorRepository extends BaseRepository {
  async findById(id: string): Promise<Vendor | null> {
    const result = await this.connection
      .select()
      .from(vendor)
      .where(and(eq(vendor.projectId, this.storeId), eq(vendor.id, id)))
      .limit(1);

    return result[0] ?? null;
  }

  async getByIds(vendorIds: readonly string[]): Promise<Vendor[]> {
    if (vendorIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(vendor)
      .where(
        and(
          eq(vendor.projectId, this.storeId),
          inArray(vendor.id, [...vendorIds])
        )
      );
  }
}
