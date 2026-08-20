import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { SearchFieldRegistry } from "../../search/planner/SearchFieldRegistry.js";
import { searchSettings, type NewSearchSettings, type SearchSettings } from "../models/index.js";
import {
  assertNonEmpty,
  type SearchSettingsValueInput,
  type SearchTextField,
} from "./searchRepositoryTypes.js";

export type SearchSettingsUpdateInput = SearchSettingsValueInput;

export interface SearchSettingsVersionAcquireInput {
  storeId: string;
  expectedVersion: number;
  initialValues?: SearchSettingsValueInput;
}

export type SearchSettingsVersionAcquireResult =
  | { status: "applied"; version: number; initialized: boolean }
  | { status: "not_found" }
  | { status: "conflict"; currentVersion: number };

export type SearchSettingsValueUpdateResult =
  { status: "applied"; value: SearchSettings } | { status: "not_found" };

export class SearchSettingsRepository extends BaseRepository {
  private readonly fields = new SearchFieldRegistry();

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
  async acquireVersion(
    input: SearchSettingsVersionAcquireInput,
  ): Promise<SearchSettingsVersionAcquireResult> {
    this.assertVersionAcquireInput(input);

    if (input.expectedVersion === 0) {
      await this.connection.execute(sql`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`listing:search:settings:${input.storeId}`}, 0)
        )
      `);

      const current = await this.findByStoreId(input.storeId);
      if (current) {
        return { status: "conflict", currentVersion: current.version };
      }
      if (!input.initialValues) {
        throw new Error("initialValues are required for settings initialization");
      }

      const created = await this.createInitial(input, input.initialValues);
      return { status: "applied", version: created.version, initialized: true };
    }

    const rows = await this.connection
      .update(searchSettings)
      .set({ version: sql`${searchSettings.version} + 1` })
      .where(
        and(
          eq(searchSettings.storeId, input.storeId),
          eq(searchSettings.version, input.expectedVersion),
        ),
      )
      .returning({ version: searchSettings.version });
    const acquired = rows[0];
    if (acquired) {
      return {
        status: "applied",
        version: acquired.version,
        initialized: false,
      };
    }

    const current = await this.findByStoreId(input.storeId);
    return current
      ? { status: "conflict", currentVersion: current.version }
      : { status: "not_found" };
  }

  @Transactional()
  async update(input: SearchSettingsUpdateInput): Promise<SearchSettingsValueUpdateResult> {
    this.assertValues(input);

    const currentRows = await this.connection
      .select()
      .from(searchSettings)
      .where(eq(searchSettings.storeId, this.storeId))
      .limit(1)
      .for("update");
    const current = currentRows[0];
    if (!current) return { status: "not_found" };

    const rows = await this.connection
      .update(searchSettings)
      .set({
        enabledFields: [...input.enabledFields],
        fieldWeights: { ...input.fieldWeights },
        typoToleranceEnabled: input.typoToleranceEnabled,
        outOfStockPolicy: input.outOfStockPolicy,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(searchSettings.storeId, this.storeId))
      .returning();
    const updated = rows[0];
    if (!updated) throw new Error("Search settings update lost its locked row");

    return { status: "applied", value: updated };
  }

  private async findByStoreId(storeId: string): Promise<SearchSettings | null> {
    const rows = await this.connection
      .select()
      .from(searchSettings)
      .where(eq(searchSettings.storeId, storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async createInitial(
    input: SearchSettingsVersionAcquireInput,
    values: SearchSettingsValueInput,
  ): Promise<SearchSettings> {
    const now = new Date().toISOString();
    const row: NewSearchSettings = {
      storeId: input.storeId,
      version: 1,
      enabledFields: [...values.enabledFields],
      fieldWeights: { ...values.fieldWeights },
      typoToleranceEnabled: values.typoToleranceEnabled,
      outOfStockPolicy: values.outOfStockPolicy,
      updatedAt: now,
    };
    const rows = await this.connection.insert(searchSettings).values(row).returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create search settings");

    return created;
  }

  private assertVersionAcquireInput(input: SearchSettingsVersionAcquireInput): void {
    assertNonEmpty(input.storeId, "storeId");
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
      throw new Error("expectedVersion must be a non-negative integer");
    }
    if (input.initialValues) this.assertValues(input.initialValues);
  }

  private assertValues(input: SearchSettingsValueInput): void {
    if (input.enabledFields.length === 0) {
      throw new Error("enabledFields must contain at least one field");
    }
    if (new Set(input.enabledFields).size !== input.enabledFields.length) {
      throw new Error("enabledFields must not contain duplicates");
    }
    for (const field of input.enabledFields) this.fields.get(field);
    for (const [field, weight] of Object.entries(input.fieldWeights)) {
      this.fields.get(field as SearchTextField);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
        throw new Error("fieldWeights must contain finite numbers greater than 0 and at most 100");
      }
    }
    if (!new Set(["SHOW", "HIDE", "PLACE_LAST"]).has(input.outOfStockPolicy)) {
      throw new Error("Unsupported outOfStockPolicy");
    }
    for (const field of input.enabledFields) {
      if (input.fieldWeights[field] === undefined) {
        throw new Error(`fieldWeights must contain a weight for ${field}`);
      }
    }
  }
}
