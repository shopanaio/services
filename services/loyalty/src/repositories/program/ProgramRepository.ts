import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  programs,
  programVersions,
  type NewProgram,
  type NewProgramVersion,
  type Program,
  type ProgramVersion,
} from "../models/index.js";

export type CreateProgramInput = Omit<NewProgram, "storeId">;
export type CreateProgramVersionInput = Omit<NewProgramVersion, "storeId">;

const programRelayQuery = createRelayQuery(
  createQuery(programs).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "loyalty-program", tieBreaker: "id" },
);

type ProgramRelayInput = InferRelayInput<typeof programRelayQuery>;

export interface ProgramConnectionInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  where?: {
    ids?: readonly string[];
    statuses?: readonly Program["status"][];
    isDefault?: boolean;
    search?: string;
  };
}

export interface ProgramConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class ProgramRepository extends BaseRepository {
  async getByIds(ids: readonly string[]): Promise<Program[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(programs)
      .where(and(eq(programs.storeId, this.storeId), inArray(programs.id, [...ids])));
  }

  async getVersionsByIds(ids: readonly string[]): Promise<ProgramVersion[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(programVersions)
      .where(and(eq(programVersions.storeId, this.storeId), inArray(programVersions.id, [...ids])));
  }

  async getVersionsByProgramIds(programIds: readonly string[]): Promise<ProgramVersion[]> {
    if (programIds.length === 0) return [];
    return this.connection
      .select()
      .from(programVersions)
      .where(and(eq(programVersions.storeId, this.storeId), inArray(programVersions.programId, [...programIds])))
      .orderBy(asc(programVersions.programId), desc(programVersions.version));
  }

  async getEffectiveVersionsByProgramIds(
    programIds: readonly string[],
    effectiveAt: string,
  ): Promise<ProgramVersion[]> {
    if (programIds.length === 0) return [];
    return this.connection
      .select()
      .from(programVersions)
      .where(and(
        eq(programVersions.storeId, this.storeId),
        inArray(programVersions.programId, [...programIds]),
        eq(programVersions.status, "ACTIVE"),
        lte(programVersions.effectiveFrom, effectiveAt),
        or(isNull(programVersions.effectiveTo), gt(programVersions.effectiveTo, effectiveAt)),
      ))
      .orderBy(asc(programVersions.programId), desc(programVersions.effectiveFrom), desc(programVersions.version));
  }

  async getConnection(input: ProgramConnectionInput): Promise<ProgramConnectionResult> {
    const { where, ...pagination } = input;
    const clauses: NonNullable<ProgramRelayInput["where"]>[] = [
      { storeId: { _eq: this.storeId } },
    ];
    if (where?.ids?.length) clauses.push({ id: { _in: [...where.ids] } });
    if (where?.statuses?.length) clauses.push({ status: { _in: [...where.statuses] } });
    if (where?.isDefault !== undefined) clauses.push({ isDefault: { _eq: where.isDefault } });
    if (where?.search?.trim()) {
      clauses.push({
        _or: [
          { code: { _containsi: where.search.trim() } },
          { name: { _containsi: where.search.trim() } },
        ],
      });
    }
    const relayInput: ProgramRelayInput = {
      ...pagination,
      where: { _and: clauses },
      orderBy: [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      programRelayQuery.execute(this.connection, relayInput),
      programRelayQuery.count(this.connection, { where: relayInput.where }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
  async lockById(id: string): Promise<Program | null> {
    const rows = await this.connection
      .select()
      .from(programs)
      .where(and(eq(programs.storeId, this.storeId), eq(programs.id, id)))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<Program | null> {
    const rows = await this.connection
      .select()
      .from(programs)
      .where(and(eq(programs.storeId, this.storeId), eq(programs.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByCode(code: string): Promise<Program | null> {
    const rows = await this.connection
      .select()
      .from(programs)
      .where(and(eq(programs.storeId, this.storeId), eq(programs.code, code)))
      .limit(1);
    return rows[0] ?? null;
  }

  async list(limit = 100): Promise<Program[]> {
    return this.connection
      .select()
      .from(programs)
      .where(eq(programs.storeId, this.storeId))
      .orderBy(desc(programs.createdAt), desc(programs.id))
      .limit(limit);
  }

  async findDefault(): Promise<Program | null> {
    const rows = await this.connection
      .select()
      .from(programs)
      .where(
        and(
          eq(programs.storeId, this.storeId),
          eq(programs.isDefault, true),
          eq(programs.status, "ACTIVE"),
          isNull(programs.archivedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async clearDefault(exceptId?: string): Promise<void> {
    await this.connection
      .update(programs)
      .set({
        isDefault: false,
        revision: sql`${programs.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(programs.storeId, this.storeId),
          eq(programs.isDefault, true),
          exceptId ? sql`${programs.id} <> ${exceptId}` : undefined,
        ),
      );
  }

  async create(input: CreateProgramInput): Promise<Program> {
    const rows = await this.connection
      .insert(programs)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async update(
    id: string,
    input: Partial<
      Pick<
        NewProgram,
        "code" | "name" | "status" | "isDefault" | "defaultCurrencyCode" | "metadata" | "archivedAt"
      >
    >,
  ): Promise<Program | null> {
    const rows = await this.connection
      .update(programs)
      .set({
        ...input,
        revision: sql`${programs.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(programs.storeId, this.storeId), eq(programs.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async findVersionById(id: string): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .select()
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async lockVersionById(id: string): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .select()
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.id, id),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  async findActiveVersion(programId: string): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .select()
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.programId, programId),
          eq(programVersions.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findEffectiveVersion(
    programId: string,
    effectiveAt: string,
  ): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .select()
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.programId, programId),
          inArray(programVersions.status, ["ACTIVE", "RETIRED"]),
          lte(programVersions.effectiveFrom, effectiveAt),
          or(isNull(programVersions.effectiveTo), gt(programVersions.effectiveTo, effectiveAt)),
        ),
      )
      .orderBy(desc(programVersions.effectiveFrom), desc(programVersions.version))
      .limit(1);
    return rows[0] ?? null;
  }

  async nextVersionNumber(programId: string): Promise<number> {
    const rows = await this.connection
      .select({ version: programVersions.version })
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.programId, programId),
        ),
      )
      .orderBy(desc(programVersions.version))
      .limit(1);
    return (rows[0]?.version ?? 0) + 1;
  }

  async listScheduledForActivation(
    effectiveAt: string,
    limit = 100,
  ): Promise<ProgramVersion[]> {
    return this.connection
      .select()
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.status, "SCHEDULED"),
          lte(programVersions.effectiveFrom, effectiveAt),
        ),
      )
      .orderBy(asc(programVersions.effectiveFrom), asc(programVersions.id))
      .limit(limit)
      .for("update", { skipLocked: true });
  }

  async listVersions(programId: string): Promise<ProgramVersion[]> {
    return this.connection
      .select()
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.programId, programId),
        ),
      )
      .orderBy(desc(programVersions.version));
  }

  async createVersion(
    input: CreateProgramVersionInput,
  ): Promise<ProgramVersion> {
    const rows = await this.connection
      .insert(programVersions)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async updateDraftVersion(
    id: string,
    input: Partial<
      Omit<
        NewProgramVersion,
        "id" | "storeId" | "programId" | "version" | "status" | "createdAt"
      >
    >,
  ): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .update(programVersions)
      .set({ ...input, revision: sql`${programVersions.revision} + 1` })
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.id, id),
          eq(programVersions.status, "DRAFT"),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async deleteDraftVersion(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.id, id),
          eq(programVersions.status, "DRAFT"),
        ),
      )
      .returning({ id: programVersions.id });
    return rows.length > 0;
  }

  async publishDraftVersion(
    id: string,
    input: {
      status: "SCHEDULED" | "ACTIVE";
      effectiveFrom: string;
      effectiveTo: string | null;
      publishedAt: string;
      publishedById: string | null;
      rules: Record<string, unknown>;
      rulesSchemaVersion: number;
    },
  ): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .update(programVersions)
      .set({ ...input, revision: sql`${programVersions.revision} + 1` })
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.id, id),
          eq(programVersions.status, "DRAFT"),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async transitionVersion(
    id: string,
    from: "SCHEDULED" | "ACTIVE",
    to: "ACTIVE" | "RETIRED",
  ): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .update(programVersions)
      .set({ status: to, revision: sql`${programVersions.revision} + 1` })
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          eq(programVersions.id, id),
          eq(programVersions.status, from),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  /** Published/scheduled versions due for cross-service reference reconciliation, least-recently-checked first. */
  async listPublishedForReconciliation(limit = 100): Promise<ProgramVersion[]> {
    return this.connection
      .select()
      .from(programVersions)
      .where(
        and(
          eq(programVersions.storeId, this.storeId),
          inArray(programVersions.status, ["ACTIVE", "SCHEDULED"]),
        ),
      )
      .orderBy(
        asc(programVersions.referenceReconciliationCheckedAt),
        asc(programVersions.id),
      )
      .limit(limit);
  }

  /**
   * Records the outcome of a post-publish reference reconciliation pass.
   * Deliberately not gated on `status = 'DRAFT'` — this updates mutable
   * operational metadata on an already-published version, not the
   * immutable rules snapshot, and must never reject/remove that version.
   */
  async updateReferenceReconciliation(
    id: string,
    status: "VALID" | "STALE",
    checkedAt: string,
  ): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .update(programVersions)
      .set({
        referenceReconciliationStatus: status,
        referenceReconciliationCheckedAt: checkedAt,
      })
      .where(and(eq(programVersions.storeId, this.storeId), eq(programVersions.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async retireActiveVersion(
    id: string,
    effectiveTo: string,
  ): Promise<ProgramVersion | null> {
    const rows = await this.connection
      .update(programVersions)
      .set({
        status: "RETIRED",
        effectiveTo,
        revision: sql`${programVersions.revision} + 1`,
      })
      .where(and(
        eq(programVersions.storeId, this.storeId),
        eq(programVersions.id, id),
        eq(programVersions.status, "ACTIVE"),
        sql`${programVersions.effectiveFrom} < ${effectiveTo}`,
      ))
      .returning();
    return rows[0] ?? null;
  }
}
