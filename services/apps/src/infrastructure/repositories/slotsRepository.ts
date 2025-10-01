import { rawSql, single, singleOrNull } from "@event-driven-io/dumbo";
import type { SQLExecutor } from "@event-driven-io/dumbo";
import type { Knex } from "knex";
import type { Slot, SlotAssignment } from "@src/kernel/types";

/**
 * Represents a row from the `slots` table in the database,
 * where timestamps are `Date` objects.
 */
type SlotRow = Omit<Slot, "created_at" | "updated_at"> & {
  /** Date and time when the record was created. */
  created_at: Date;
  /** Date and time when the record was last updated. */
  updated_at: Date;
};

/**
 * Represents a row from the `slot_assignments` table in the database,
 * where timestamps are `Date` objects.
 */
type SlotAssignmentRow = Omit<SlotAssignment, "created_at" | "updated_at"> & {
  /** Date and time when the record was created. */
  created_at: Date;
  /** Date and time when the record was last updated. */
  updated_at: Date;
};

const slotColumns = [
  "s.id",
  "s.project_id",
  "s.domain",
  "s.provider",
  "s.provider_config_id",
  "s.capabilities",
  "s.created_at as created_at",
  "s.updated_at as updated_at",
  // Provider config fields (joined)
  "pc.data as config_data",
  "pc.version as config_version",
  "pc.status as config_status",
  "pc.environment as config_environment",
];

const assignmentColumns = [
  "id",
  "project_id",
  "aggregate",
  "aggregate_id",
  "slot_id",
  "domain",
  "precedence",
  "status",
  "created_at",
  "updated_at",
];

/**
 * Repository for managing slots and their assignments.
 * Provides direct data access without encapsulating complex business logic.
 */
export class SlotsRepository {
  /**
   * @param executor - Executor for running SQL queries from Dumbo.
   * @param knex - Knex instance for building queries.
   */
  constructor(
    private readonly executor: SQLExecutor,
    private readonly knex: Knex
  ) {}

  // =================================================================
  // Slot (Catalog) Methods
  // =================================================================

  /**
   * Finds a slot in the catalog by its ID and project ID.
   * @param id - Unique identifier of the slot.
   * @param projectId - Unique identifier of the project.
   * @returns Slot object or `null` if the slot is not found.
   */
  async findSlotById(id: string, projectId: string): Promise<Slot | null> {
    const query = this.knex
      .select(slotColumns)
      .from("platform.slots as s")
      .innerJoin(
        "platform.provider_configs as pc",
        "s.provider_config_id",
        "pc.id"
      )
      .where({ "s.id": id, "s.project_id": projectId })
      .toString();

    const result = await singleOrNull(this.executor.query<any>(rawSql(query)));
    if (!result) return null;

    return this.mapRowToSlot(result);
  }

  /**
   * Finds all slots for the specified project, optionally filtering by domain.
   * @param projectId - Unique identifier of the project.
   * @param domain - Optional domain for filtering slots.
   * @returns Array of found slots.
   */
  async findAllSlots(projectId: string, domain?: string): Promise<Slot[]> {
    let queryBuilder = this.knex
      .select(slotColumns)
      .from("platform.slots as s")
      .innerJoin(
        "platform.provider_configs as pc",
        "s.provider_config_id",
        "pc.id"
      )
      .where({ "s.project_id": projectId })
      .orderBy("s.updated_at", "desc");

    if (domain) {
      queryBuilder = queryBuilder.where({ "s.domain": domain });
    }

    const { rows } = await this.executor.query<any>(
      rawSql(queryBuilder.toString())
    );
    return rows.map((row) => this.mapRowToSlot(row));
  }

  /**
   * Maps a database row (with joined provider_config) to Slot object
   */
  private mapRowToSlot(row: any): Slot {
    return {
      id: row.id,
      project_id: row.project_id,
      domain: row.domain,
      provider: row.provider,
      provider_config_id: row.provider_config_id,
      capabilities: row.capabilities || [],
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : row.updated_at,
      config: {
        id: row.provider_config_id,
        project_id: row.project_id,
        provider: row.provider,
        data: row.config_data || {},
        version: row.config_version || 1,
        status: row.config_status || "active",
        environment: row.config_environment || "production",
        created_at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : row.created_at,
        updated_at:
          row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : row.updated_at,
      },
    };
  }

  /**
   * Upserts provider config - creates or updates configuration for a provider
   */
  private async upsertProviderConfig(params: {
    projectId: string;
    provider: string;
    data?: Record<string, unknown>;
    version?: number;
    status?: "active" | "inactive" | "maintenance" | "deprecated";
    environment?: "development" | "staging" | "production";
  }): Promise<string> {
    const {
      projectId,
      provider,
      data = {},
      version = 1,
      status = "active",
      environment = "production",
    } = params;

    const query = this.knex
      .insert({
        project_id: projectId,
        provider,
        data: this.knex.raw(`?::jsonb`, [JSON.stringify(data)]),
        version,
        status,
        environment,
      })
      .withSchema("platform")
      .into("provider_configs")
      .onConflict(["project_id", "provider"])
      .merge({
        data: this.knex.raw(`?::jsonb`, [JSON.stringify(data)]),
        version,
        status,
        environment,
        updated_at: this.knex.raw("now()"),
      })
      .returning("id")
      .toString();

    const result = await single(
      this.executor.query<{ id: string }>(rawSql(query))
    );
    return result.id;
  }

  /**
   * Creates a new slot or updates an existing one based on the unique key (projectId, domain, provider).
   * Now works with normalized provider_configs structure.
   * @param params - Parameters for creating/updating the slot.
   * @returns Created or updated slot object.
   */
  async upsertSlot(params: {
    /** Slot domain (e.g., 'shipping', 'payment'). */
    domain: string;
    /** Project ID. */
    projectId: string;
    /** Provider code (e.g., 'novaposhta'). */
    provider: string;
    /** List of provider capabilities. */
    capabilities?: string[];
    /** Slot configuration data. */
    data?: Record<string, unknown>;
    /** Slot status. */
    status?: "active" | "inactive" | "maintenance" | "deprecated";
    /** Environment */
    environment?: "development" | "staging" | "production";
    /** Version */
    version?: number;
  }): Promise<Slot> {
    const {
      domain,
      provider,
      capabilities = [],
      data = {},
      projectId,
      status = "active",
      environment = "production",
      version = 1,
    } = params;

    // Step 1: Upsert provider config (shared across all domains for this provider)
    const providerConfigId = await this.upsertProviderConfig({
      projectId,
      provider,
      data,
      version,
      status,
      environment,
    });

    // Step 2: Upsert slot (domain-specific reference to provider config)
    const query = this.knex
      .insert({
        domain,
        project_id: projectId,
        provider,
        provider_config_id: providerConfigId,
        capabilities,
      })
      .withSchema("platform")
      .into("slots")
      .onConflict(["project_id", "domain", "provider"])
      .merge({
        capabilities,
        provider_config_id: providerConfigId,
        updated_at: this.knex.raw("now()"),
      })
      .returning(["id"])
      .toString();

    const result = await single(
      this.executor.query<{ id: string }>(rawSql(query))
    );

    // Step 3: Fetch the complete slot with joined config
    const slot = await this.findSlotById(result.id, projectId);
    if (!slot) {
      throw new Error(`Failed to fetch created slot ${result.id}`);
    }

    return slot;
  }

  /**
   * Deletes a slot from the catalog by its ID and project ID.
   * @param id - Unique identifier of the slot to delete.
   * @param projectId - Unique identifier of the project.
   * @returns `true` on successful deletion, otherwise `false`.
   */
  async deleteSlot(id: string, projectId: string): Promise<boolean> {
    const query = this.knex
      .withSchema("platform")
      .table("slots")
      .delete()
      .where({ id, project_id: projectId })
      .toString();

    const res = await this.executor.command(rawSql(query));
    return (res.rowCount ?? 0) > 0;
  }

  // =================================================================
  // Slot Assignment Methods
  // =================================================================

  /**
   * Finds assignment by its ID and project ID.
   * @param id - Unique identifier of the assignment.
   * @param projectId - Unique identifier of the project.
   * @returns Assignment object or `null` if not found.
   */
  async findAssignmentById(
    id: string,
    projectId: string
  ): Promise<SlotAssignment | null> {
    const query = this.knex
      .select(assignmentColumns)
      .from("platform.slot_assignments")
      .where({ id, project_id: projectId })
      .toString();

    const result = await singleOrNull(
      this.executor.query<SlotAssignmentRow>(rawSql(query))
    );
    if (!result) return null;

    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  /**
   * Creates new slot assignment to aggregate.
   * @param params - Parameters for creating assignment.
   * @returns Created assignment object.
   */
  async createAssignment(params: {
    /** Project ID. */
    projectId: string;
    /** Aggregate name (e.g., 'checkout'). */
    aggregate: string;
    /** Aggregate instance ID. */
    aggregateId: string;
    /** Slot ID from catalog. */
    slotId: string;
    /** Domain where assignment is active. */
    domain: string;
    /** Assignment precedence (lower - higher). */
    precedence?: number;
  }): Promise<SlotAssignment> {
    const {
      projectId,
      aggregate,
      aggregateId,
      slotId,
      domain,
      precedence = 0,
    } = params;

    const query = this.knex
      .insert({
        project_id: projectId,
        aggregate,
        aggregate_id: aggregateId,
        slot_id: slotId,
        domain,
        precedence,
        status: "active",
      })
      .withSchema("platform")
      .into("slot_assignments")
      .returning(assignmentColumns)
      .toString();

    const result = await single(
      this.executor.query<SlotAssignmentRow>(rawSql(query))
    );
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  /**
   * Updates existing assignment (status or precedence).
   * @param id - Unique identifier of assignment to update.
   * @param projectId - Project ID.
   * @param data - Data to update.
   * @returns Updated assignment object or `null` if assignment not found.
   */
  async updateAssignment(
    id: string,
    projectId: string,
    data: {
      /** New precedence. */
      precedence?: number;
      /** New status. */
      status?: "active" | "disabled";
    }
  ): Promise<SlotAssignment | null> {
    const query = this.knex
      .withSchema("platform")
      .table("slot_assignments")
      .update({ ...data, updated_at: this.knex.raw("now()") })
      .where({ id, project_id: projectId })
      .returning(assignmentColumns)
      .toString();

    const result = await singleOrNull(
      this.executor.query<SlotAssignmentRow>(rawSql(query))
    );
    if (!result) return null;

    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  /**
   * Deletes slot assignment by its ID and project ID.
   * @param id - Unique identifier of assignment to delete.
   * @param projectId - Unique identifier of the project.
   * @returns `true` on successful deletion, otherwise `false`.
   */
  async deleteAssignment(id: string, projectId: string): Promise<boolean> {
    const query = this.knex
      .withSchema("platform")
      .table("slot_assignments")
      .delete()
      .where({ id, project_id: projectId })
      .toString();
    const res = await this.executor.command(rawSql(query));
    return (res.rowCount ?? 0) > 0;
  }

  // =================================================================
  // Slot Resolution Methods
  // =================================================================

  /**
   * Finds one most prioritized active assignment for aggregate.
   * Used to determine which provider should be used at the moment.
   * @param domain - Domain where assignment is searched.
   * @param projectId - Project ID.
   * @param aggregate - Aggregate name.
   * @param aggregateId - Aggregate instance ID.
   * @returns Object with slot data and its assignment, or `null`.
   */
  async findResolvedSlotForAggregate(
    domain: string,
    projectId: string,
    aggregate: string,
    aggregateId: string
  ): Promise<{ slot: Slot; assignment: SlotAssignment } | null> {
    const query = this.knex
      .select({
        slot_id: "s.id",
        slot_project_id: "s.project_id",
        slot_domain: "s.domain",
        slot_provider: "s.provider",
        slot_provider_config_id: "s.provider_config_id",
        slot_capabilities: "s.capabilities",
        slot_created_at: "s.created_at",
        slot_updated_at: "s.updated_at",
        // Provider config fields
        config_data: "pc.data",
        config_version: "pc.version",
        config_status: "pc.status",
        config_environment: "pc.environment",
        assignment_id: "sa.id",
        assignment_project_id: "sa.project_id",
        assignment_aggregate: "sa.aggregate",
        assignment_aggregate_id: "sa.aggregate_id",
        assignment_slot_id: "sa.slot_id",
        assignment_domain: "sa.domain",
        assignment_precedence: "sa.precedence",
        assignment_status: "sa.status",
        assignment_created_at: "sa.created_at",
        assignment_updated_at: "sa.updated_at",
      })
      .from({ sa: "platform.slot_assignments" })
      .join({ s: "platform.slots" }, "s.id", "sa.slot_id")
      .join({ pc: "platform.provider_configs" }, "s.provider_config_id", "pc.id")
      .where({
        "sa.project_id": projectId,
        "sa.aggregate": aggregate,
        "sa.aggregate_id": aggregateId,
        "sa.domain": domain,
        "sa.status": "active",
      })
      .orderBy("sa.precedence", "asc")
      .orderBy("sa.updated_at", "desc")
      .limit(1)
      .toString();

    /**
     * Helper type for JOIN query result between slots, provider_configs and assignments.
     */
    type ResolvedSlotRow = {
      slot_id: string;
      slot_project_id: string;
      slot_domain: string;
      slot_provider: string;
      slot_provider_config_id: string;
      slot_capabilities: string[];
      slot_created_at: Date;
      slot_updated_at: Date;
      config_data: Record<string, unknown>;
      config_version: number;
      config_status: string;
      config_environment: string;
      assignment_id: string;
      assignment_project_id: string;
      assignment_aggregate: string;
      assignment_aggregate_id: string;
      assignment_slot_id: string;
      assignment_domain: string;
      assignment_precedence: number;
      assignment_status: "active" | "disabled";
      assignment_created_at: Date;
      assignment_updated_at: Date;
    };

    const row = await singleOrNull(
      this.executor.query<ResolvedSlotRow>(rawSql(query))
    );

    if (!row) return null;

    const slot: Slot = {
      id: row.slot_id,
      project_id: row.slot_project_id,
      domain: row.slot_domain,
      provider: row.slot_provider,
      provider_config_id: row.slot_provider_config_id,
      capabilities: row.slot_capabilities,
      created_at: row.slot_created_at.toISOString(),
      updated_at: row.slot_updated_at.toISOString(),
      config: {
        id: row.slot_provider_config_id,
        project_id: row.slot_project_id,
        provider: row.slot_provider,
        data: row.config_data,
        version: row.config_version,
        status: row.config_status as any,
        environment: row.config_environment as any,
        created_at: row.slot_created_at.toISOString(),
        updated_at: row.slot_updated_at.toISOString(),
      },
    };

    const assignment: SlotAssignment = {
      id: row.assignment_id,
      project_id: row.assignment_project_id,
      aggregate: row.assignment_aggregate,
      aggregate_id: row.assignment_aggregate_id,
      slot_id: row.assignment_slot_id,
      domain: row.assignment_domain,
      precedence: row.assignment_precedence,
      status: row.assignment_status,
      created_at: row.assignment_created_at.toISOString(),
      updated_at: row.assignment_updated_at.toISOString(),
    };

    return { slot, assignment };
  }

  /**
   * Finds all assignments for specified aggregate.
   * @param domain - Domain for filtering assignments.
   * @param projectId - Project ID.
   * @param aggregate - Aggregate name.
   * @param aggregateId - Aggregate instance ID.
   * @param includeDisabled - Flag indicating whether to include disabled assignments in result.
   * @returns Array of objects containing slot data and its assignment.
   */
  async findAllAssignmentsForAggregate(
    domain: string,
    projectId: string,
    aggregate: string,
    aggregateId: string,
    includeDisabled = false
  ): Promise<Array<{ slot: Slot; assignment: SlotAssignment }>> {
    let query = this.knex
      .select({
        slot_id: "s.id",
        slot_project_id: "s.project_id",
        slot_domain: "s.domain",
        slot_provider: "s.provider",
        slot_provider_config_id: "s.provider_config_id",
        slot_capabilities: "s.capabilities",
        slot_created_at: "s.created_at",
        slot_updated_at: "s.updated_at",
        config_data: "pc.data",
        config_version: "pc.version",
        config_status: "pc.status",
        config_environment: "pc.environment",
        assignment_id: "sa.id",
        assignment_project_id: "sa.project_id",
        assignment_aggregate: "sa.aggregate",
        assignment_aggregate_id: "sa.aggregate_id",
        assignment_slot_id: "sa.slot_id",
        assignment_domain: "sa.domain",
        assignment_precedence: "sa.precedence",
        assignment_status: "sa.status",
        assignment_created_at: "sa.created_at",
        assignment_updated_at: "sa.updated_at",
      })
      .from({ sa: "platform.slot_assignments" })
      .join({ s: "platform.slots" }, "s.id", "sa.slot_id")
      .join({ pc: "platform.provider_configs" }, "s.provider_config_id", "pc.id")
      .where({
        "sa.project_id": projectId,
        "sa.aggregate": aggregate,
        "sa.aggregate_id": aggregateId,
        "sa.domain": domain,
      });

    if (!includeDisabled) {
      query = query.where("sa.status", "active");
    }

    const queryString = query
      .orderBy("sa.precedence", "asc")
      .orderBy("sa.updated_at", "desc")
      .toString();

    /**
     * Helper type for JOIN query result between slots, provider_configs and assignments.
     */
    type ResolvedSlotRow = {
      slot_id: string;
      slot_project_id: string;
      slot_domain: string;
      slot_provider: string;
      slot_provider_config_id: string;
      slot_capabilities: string[];
      slot_created_at: Date;
      slot_updated_at: Date;
      config_data: Record<string, unknown>;
      config_version: number;
      config_status: string;
      config_environment: string;
      assignment_id: string;
      assignment_project_id: string;
      assignment_aggregate: string;
      assignment_aggregate_id: string;
      assignment_slot_id: string;
      assignment_domain: string;
      assignment_precedence: number;
      assignment_status: "active" | "disabled";
      assignment_created_at: Date;
      assignment_updated_at: Date;
    };

    const { rows } = await this.executor.query<ResolvedSlotRow>(
      rawSql(queryString)
    );

    return rows.map((row) => ({
      slot: {
        id: row.slot_id,
        project_id: row.slot_project_id,
        domain: row.slot_domain,
        provider: row.slot_provider,
        provider_config_id: row.slot_provider_config_id,
        capabilities: row.slot_capabilities,
        created_at: row.slot_created_at.toISOString(),
        updated_at: row.slot_updated_at.toISOString(),
        config: {
          id: row.slot_provider_config_id,
          project_id: row.slot_project_id,
          provider: row.slot_provider,
          data: row.config_data,
          version: row.config_version,
          status: row.config_status as any,
          environment: row.config_environment as any,
          created_at: row.slot_created_at.toISOString(),
          updated_at: row.slot_updated_at.toISOString(),
        },
      },
      assignment: {
        id: row.assignment_id,
        project_id: row.assignment_project_id,
        aggregate: row.assignment_aggregate,
        aggregate_id: row.assignment_aggregate_id,
        slot_id: row.assignment_slot_id,
        domain: row.assignment_domain,
        precedence: row.assignment_precedence,
        status: row.assignment_status,
        created_at: row.assignment_created_at.toISOString(),
        updated_at: row.assignment_updated_at.toISOString(),
      },
    }));
  }
}
