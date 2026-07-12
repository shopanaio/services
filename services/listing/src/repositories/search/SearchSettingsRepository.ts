import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { BaseRepository } from "../BaseRepository.js";
import {
  searchConfigurationAudit,
  searchSettings,
  type NewSearchConfigurationAudit,
  type NewSearchSettings,
  type SearchSettings,
} from "../models/index.js";
import {
  assertNonEmpty,
  type SearchAuditInput,
  type SearchOptimisticMutationResult,
  type SearchSettingsValueInput,
} from "./searchRepositoryTypes.js";

export interface SearchSettingsUpdateInput
  extends SearchSettingsValueInput,
    SearchAuditInput {
  expectedVersion: number | null;
}

export class SearchSettingsRepository extends BaseRepository {
  @ReadOnly()
  async find(): Promise<SearchSettings | null> {
    const rows = await this.connection
      .select()
      .from(searchSettings)
      .where(eq(searchSettings.storeId, this.storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  @Transactional()
  async update(
    input: SearchSettingsUpdateInput,
  ): Promise<SearchOptimisticMutationResult<SearchSettings>> {
    this.assertInput(input);

    await this.connection.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`listing:search:settings:${this.storeId}`}, 0)
      )
    `);

    const currentRows = await this.connection
      .select()
      .from(searchSettings)
      .where(eq(searchSettings.storeId, this.storeId))
      .limit(1)
      .for("update");
    const current = currentRows[0] ?? null;

    if (!current) {
      if (input.expectedVersion !== null) {
        return { status: "not_found" };
      }
      const created = await this.createInitial(input);
      return { status: "applied", value: created };
    }

    if (input.expectedVersion !== current.version) {
      return { status: "conflict", currentVersion: current.version };
    }

    const now = new Date().toISOString();
    const nextVersion = current.version + 1;
    const rows = await this.connection
      .update(searchSettings)
      .set({
        version: nextVersion,
        enabledFields: [...input.enabledFields],
        fieldWeights: { ...input.fieldWeights },
        typoToleranceEnabled: input.typoToleranceEnabled,
        outOfStockPolicy: input.outOfStockPolicy,
        updatedBy: input.actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(searchSettings.storeId, this.storeId),
          eq(searchSettings.version, current.version),
        ),
      )
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error("Search settings update lost its locked row");
    }

    await this.insertAudit({
      version: nextVersion,
      action: "update",
      beforeValue: this.toAuditValue(current),
      afterValue: this.toAuditValue(updated),
      actorId: input.actorId,
      requestId: input.requestId,
    });
    return { status: "applied", value: updated };
  }

  private async createInitial(
    input: SearchSettingsUpdateInput,
  ): Promise<SearchSettings> {
    const now = new Date().toISOString();
    const row: NewSearchSettings = {
      storeId: this.storeId,
      version: 1,
      enabledFields: [...input.enabledFields],
      fieldWeights: { ...input.fieldWeights },
      typoToleranceEnabled: input.typoToleranceEnabled,
      outOfStockPolicy: input.outOfStockPolicy,
      updatedBy: input.actorId,
      updatedAt: now,
    };
    const rows = await this.connection.insert(searchSettings).values(row).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create search settings");

    await this.insertAudit({
      version: 1,
      action: "create",
      beforeValue: null,
      afterValue: this.toAuditValue(created),
      actorId: input.actorId,
      requestId: input.requestId,
    });
    return created;
  }

  private async insertAudit(input: {
    version: number;
    action: "create" | "update";
    beforeValue: unknown | null;
    afterValue: unknown;
    actorId: string;
    requestId: string;
  }): Promise<void> {
    const audit: NewSearchConfigurationAudit = {
      storeId: this.storeId,
      auditId: uuidv7(),
      resourceVersion: input.version,
      resourceType: "settings",
      resourceId: null,
      action: input.action,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      actorId: input.actorId,
      requestId: input.requestId,
    };
    await this.connection.insert(searchConfigurationAudit).values(audit);
  }

  private toAuditValue(row: SearchSettings): Record<string, unknown> {
    return {
      version: row.version,
      enabledFields: row.enabledFields,
      fieldWeights: row.fieldWeights,
      typoToleranceEnabled: row.typoToleranceEnabled,
      outOfStockPolicy: row.outOfStockPolicy,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  private assertInput(input: SearchSettingsUpdateInput): void {
    assertNonEmpty(input.actorId, "actorId");
    assertNonEmpty(input.requestId, "requestId");
    if (
      input.expectedVersion !== null &&
      (!Number.isInteger(input.expectedVersion) || input.expectedVersion <= 0)
    ) {
      throw new Error("expectedVersion must be null or a positive integer");
    }
    if (input.enabledFields.length === 0) {
      throw new Error("enabledFields must contain at least one field");
    }
    if (new Set(input.enabledFields).size !== input.enabledFields.length) {
      throw new Error("enabledFields must not contain duplicates");
    }
    const fields = new Set([
      "product_title",
      "variant_title",
      "vendor_name",
      "category_name",
    ]);
    if (input.enabledFields.some((field) => !fields.has(field))) {
      throw new Error("enabledFields contains an unsupported field");
    }
    if (Object.keys(input.fieldWeights).some((field) => !fields.has(field))) {
      throw new Error("fieldWeights contains an unsupported field");
    }
    if (!new Set(["SHOW", "HIDE", "PLACE_LAST"]).has(input.outOfStockPolicy)) {
      throw new Error("Unsupported outOfStockPolicy");
    }
    for (const field of input.enabledFields) {
      const weight = input.fieldWeights[field];
      if (weight === undefined) {
        throw new Error(`fieldWeights must contain a weight for ${field}`);
      }
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error("fieldWeights must contain finite positive numbers");
      }
    }
  }
}
