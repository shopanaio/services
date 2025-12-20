import { eq } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { locale, type Locale } from "../models/index.js";

export interface CreateLocaleData {
  code: string;
  isActive?: boolean;
}

export interface UpdateLocaleData {
  isActive?: boolean;
}

export class LocaleRepository extends BaseRepository {
  @ReadOnly()
  async findByProjectId(projectId: string): Promise<Locale[]> {
    return this.connection
      .select()
      .from(locale)
      .where(eq(locale.projectId, projectId));
  }
}
