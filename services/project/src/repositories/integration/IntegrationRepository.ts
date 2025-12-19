import { eq, and } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  projectIntegration,
  type ProjectIntegration,
  type IntegrationType,
  type IntegrationStatus,
} from "../models/index.js";

export interface CreateIntegrationData {
  projectId: string;
  type: IntegrationType;
  provider: string;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface UpdateIntegrationData {
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  lastSyncAt?: Date;
  errorMessage?: string | null;
}

export class IntegrationRepository extends BaseRepository {
  /**
   * Create a new integration
   */
  async create(data: CreateIntegrationData): Promise<ProjectIntegration> {
    const [result] = await this.connection
      .insert(projectIntegration)
      .values({
        projectId: data.projectId,
        type: data.type,
        provider: data.provider,
        status: data.status ?? "active",
        config: data.config ?? {},
        credentials: data.credentials ?? {},
      })
      .returning();

    return result;
  }

  /**
   * Find integration by project and type
   */
  async findByType(
    projectId: string,
    type: IntegrationType
  ): Promise<ProjectIntegration | undefined> {
    const [result] = await this.connection
      .select()
      .from(projectIntegration)
      .where(
        and(
          eq(projectIntegration.projectId, projectId),
          eq(projectIntegration.type, type)
        )
      );

    return result;
  }

  /**
   * Find all integrations for a project
   */
  async findByProject(projectId: string): Promise<ProjectIntegration[]> {
    return this.connection
      .select()
      .from(projectIntegration)
      .where(eq(projectIntegration.projectId, projectId));
  }

  /**
   * Update integration
   */
  async update(
    projectId: string,
    type: IntegrationType,
    data: UpdateIntegrationData
  ): Promise<ProjectIntegration | undefined> {
    const [result] = await this.connection
      .update(projectIntegration)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectIntegration.projectId, projectId),
          eq(projectIntegration.type, type)
        )
      )
      .returning();

    return result;
  }

  /**
   * Upsert integration (create or update)
   */
  async upsert(data: CreateIntegrationData): Promise<ProjectIntegration> {
    const existing = await this.findByType(data.projectId, data.type);

    if (existing) {
      const updated = await this.update(data.projectId, data.type, {
        status: data.status,
        config: data.config,
        credentials: data.credentials,
      });
      return updated!;
    }

    return this.create(data);
  }

  /**
   * Delete integration
   */
  async delete(projectId: string, type: IntegrationType): Promise<boolean> {
    const result = await this.connection
      .delete(projectIntegration)
      .where(
        and(
          eq(projectIntegration.projectId, projectId),
          eq(projectIntegration.type, type)
        )
      )
      .returning({ id: projectIntegration.id });

    return result.length > 0;
  }
}
