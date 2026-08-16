import { and, desc, eq, sql } from "drizzle-orm";
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

export class ProgramRepository extends BaseRepository {
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
}
