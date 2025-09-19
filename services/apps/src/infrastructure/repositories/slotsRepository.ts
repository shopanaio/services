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
  "id",
  "project_id",
  "domain",
  "provider",
  "status",
  "environment",
  "capabilities",
  "version",
  "data",
  "created_at",
  "updated_at",
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
  async findSlotById(
    id: string,
    projectId: string
  ): Promise<Slot | null> {
    const query = this.knex
      .select(slotColumns)
      .from("platform.slots")
      .where({ id, project_id: projectId })
      .toString();

    const result = await singleOrNull(
      this.executor.query<SlotRow>(rawSql(query))
    );
    if (!result) return null;

    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  /**
   * Finds all slots for the specified project, optionally filtering by domain.
   * @param projectId - Unique identifier of the project.
   * @param domain - Optional domain for filtering slots.
   * @returns Array of found slots.
   */
  async findAllSlots(
    projectId: string,
    domain?: string
  ): Promise<Slot[]> {
    let queryBuilder = this.knex
      .select(slotColumns)
      .from("platform.slots")
      .where({ project_id: projectId })
      .orderBy("updated_at", "desc");

    if (domain) {
      queryBuilder = queryBuilder.where({ domain });
    }

    const { rows } = await this.executor.query<SlotRow>(
      rawSql(queryBuilder.toString())
    );
    return rows.map((row) => ({
      ...row,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }));
  }

  /**
   * Creates a new slot or updates an existing one based on the unique key (projectId, domain, provider).
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
  }): Promise<Slot> {
    const {
      domain,
      provider,
      capabilities = [],
      data = {},
      projectId,
      status = 'active',
    } = params;

    const query = this.knex
      .insert({
        domain,
        project_id: projectId,
        provider,
        capabilities,
        status,
        data: this.knex.raw(`?::jsonb`, [JSON.stringify(data)]),
      })
      .withSchema("platform")
      .into("slots")
      .onConflict(["project_id", "domain", "provider"])
      .merge({
        capabilities,
        status,
        data: this.knex.raw(`?::jsonb`, [JSON.stringify(data)]),
        updated_at: this.knex.raw("now()"),
      })
      .returning(slotColumns)
      .toString();

    const result = await single(this.executor.query<SlotRow>(rawSql(query)));
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
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
        slot_domain: "s.domain",
        slot_provider: "s.provider",
        slot_capabilities: "s.capabilities",
        slot_version: "s.version",
        slot_data: "s.data",
        slot_created_at: "s.created_at",
        slot_updated_at: "s.updated_at",
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
     * Helper type for JOIN query result between slots and assignments.
     */
    type ResolvedSlotRow = {
      /** Slot ID. */
      slot_id: string;
      /** Slot domain. */
      slot_domain: string;
      /** Slot provider. */
      slot_provider: string;
      /** Slot status. */
      slot_status: string;
      /** Slot environment. */
      slot_environment: string;
      /** Slot capabilities. */
      slot_capabilities: string[];
      /** Slot version. */
      slot_version: number;
      /** Slot data. */
      slot_data: Record<string, unknown>;
      /** Slot creation date. */
      slot_created_at: Date;
      /** Slot update date. */
      slot_updated_at: Date;
      /** Assignment ID. */
      assignment_id: string;
      /** Project ID for assignment. */
      assignment_project_id: string;
      /** Assignment aggregate. */
      assignment_aggregate: string;
      /** Aggregate ID for assignment. */
      assignment_aggregate_id: string;
      /** Slot ID for assignment. */
      assignment_slot_id: string;
      /** Assignment domain. */
      assignment_domain: string;
      /** Assignment precedence. */
      assignment_precedence: number;
      /** Assignment status. */
      assignment_status: "active" | "disabled";
      /** Assignment creation date. */
      assignment_created_at: Date;
      /** Assignment update date. */
      assignment_updated_at: Date;
    };

    const row = await singleOrNull(
      this.executor.query<ResolvedSlotRow>(rawSql(query))
    );

    if (!row) return null;

    const slot: Slot = {
      id: row.slot_id,
      domain: row.slot_domain,
      provider: row.slot_provider,
      status: row.slot_status as any,
      environment: row.slot_environment as any,
      capabilities: row.slot_capabilities,
      version: row.slot_version,
      data: row.slot_data,
      created_at: row.slot_created_at.toISOString(),
      updated_at: row.slot_updated_at.toISOString(),
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
        slot_domain: "s.domain",
        slot_provider: "s.provider",
        slot_capabilities: "s.capabilities",
        slot_version: "s.version",
        slot_data: "s.data",
        slot_created_at: "s.created_at",
        slot_updated_at: "s.updated_at",
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
     * Helper type for JOIN query result between slots and assignments.
     */
    type ResolvedSlotRow = {
      /** Slot ID. */
      slot_id: string;
      /** Slot domain. */
      slot_domain: string;
      /** Slot provider. */
      slot_provider: string;
      /** Slot status. */
      slot_status: string;
      /** Slot environment. */
      slot_environment: string;
      /** Slot capabilities. */
      slot_capabilities: string[];
      /** Slot version. */
      slot_version: number;
      /** Slot data. */
      slot_data: Record<string, unknown>;
      /** Slot creation date. */
      slot_created_at: Date;
      /** Slot update date. */
      slot_updated_at: Date;
      /** Assignment ID. */
      assignment_id: string;
      /** Project ID for assignment. */
      assignment_project_id: string;
      /** Assignment aggregate. */
      assignment_aggregate: string;
      /** Aggregate ID for assignment. */
      assignment_aggregate_id: string;
      /** Slot ID for assignment. */
      assignment_slot_id: string;
      /** Assignment domain. */
      assignment_domain: string;
      /** Assignment precedence. */
      assignment_precedence: number;
      /** Assignment status. */
      assignment_status: "active" | "disabled";
      /** Assignment creation date. */
      assignment_created_at: Date;
      /** Assignment update date. */
      assignment_updated_at: Date;
    };

    const { rows } = await this.executor.query<ResolvedSlotRow>(
      rawSql(queryString)
    );

    return rows.map((row) => ({
      slot: {
        id: row.slot_id,
        domain: row.slot_domain,
        provider: row.slot_provider,
        capabilities: row.slot_capabilities,
        version: row.slot_version,
        data: row.slot_data,
        created_at: row.slot_created_at.toISOString(),
        updated_at: row.slot_updated_at.toISOString(),
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
