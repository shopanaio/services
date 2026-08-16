import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  customerSegmentStoreContext,
  type CustomerSegmentStoreContext,
} from "../models/index.js";

export interface CustomerSegmentStoreContextInput {
  readonly storeId: string;
  readonly currencyCode: string;
  readonly currencyExponent: number;
  readonly timeZone: string;
  readonly configurationRevision: number;
  readonly occurredAt: string;
}

export interface CustomerSegmentStoreContextApplyResult {
  readonly context: CustomerSegmentStoreContext;
  readonly applied: boolean;
  readonly timeZoneChanged: boolean;
  readonly currencyChanged: boolean;
}

export class CustomerSegmentStoreContextRepository extends BaseRepository {
  @ReadOnly()
  async findByStoreId(
    storeId: string,
  ): Promise<CustomerSegmentStoreContext | null> {
    const rows = await this.connection
      .select()
      .from(customerSegmentStoreContext)
      .where(eq(customerSegmentStoreContext.storeId, storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  async apply(
    input: CustomerSegmentStoreContextInput,
  ): Promise<CustomerSegmentStoreContextApplyResult> {
    const existingRows = await this.connection
      .select()
      .from(customerSegmentStoreContext)
      .where(eq(customerSegmentStoreContext.storeId, input.storeId))
      .limit(1)
      .for("update");
    const existing = existingRows[0];

    if (!existing) {
      const rows = await this.connection
        .insert(customerSegmentStoreContext)
        .values({
          id: await this.generateUuidV7(),
          storeId: input.storeId,
          currencyCode: input.currencyCode,
          currencyExponent: input.currencyExponent,
          timeZone: input.timeZone,
          configurationRevision: input.configurationRevision,
          updatedAt: input.occurredAt,
        })
        .returning();
      return {
        context: rows[0],
        applied: true,
        timeZoneChanged: false,
        currencyChanged: false,
      };
    }

    if (
      existing.currencyCode !== input.currencyCode ||
      existing.currencyExponent !== input.currencyExponent
    ) {
      return {
        context: existing,
        applied: false,
        timeZoneChanged: false,
        currencyChanged: true,
      };
    }
    if (input.configurationRevision < existing.configurationRevision) {
      return {
        context: existing,
        applied: false,
        timeZoneChanged: false,
        currencyChanged: false,
      };
    }
    if (input.configurationRevision === existing.configurationRevision) {
      if (
        existing.timeZone !== input.timeZone ||
        existing.updatedAt !== input.occurredAt
      ) {
        throw new Error(
          `Store segment context revision ${input.configurationRevision} has conflicting payloads`,
        );
      }
      return {
        context: existing,
        applied: false,
        timeZoneChanged: false,
        currencyChanged: false,
      };
    }

    const rows = await this.connection
      .update(customerSegmentStoreContext)
      .set({
        timeZone: input.timeZone,
        configurationRevision: input.configurationRevision,
        updatedAt: input.occurredAt,
      })
      .where(
        and(
          eq(customerSegmentStoreContext.id, existing.id),
          eq(
            customerSegmentStoreContext.configurationRevision,
            existing.configurationRevision,
          ),
        ),
      )
      .returning();
    if (!rows[0]) {
      throw new Error("Concurrent Store segment context update");
    }
    return {
      context: rows[0],
      applied: true,
      timeZoneChanged: existing.timeZone !== input.timeZone,
      currencyChanged: false,
    };
  }
}
