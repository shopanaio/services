import type { TransactionManager } from "@shopana/shared-kernel";
import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { LinkedOwnerRef, ProtectedResourceRef } from "@shopana/rbac";
import type { Database } from "../infrastructure/db/database.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  serviceLinkedResource,
  resourceManagement,
  type ResourceManagementMode,
  type ServiceLinkedResource,
} from "./models/index.js";

export type ServiceLinkedResourceBinding = ServiceLinkedResource;

export interface CreateServiceLinkedResourceBindingInput extends ProtectedResourceRef {
  linkedService: string;
  linkedOwnerType: string;
  linkedOwnerId: string;
  createdBy?: string | null;
}

export class ServiceLinkedResourceRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @ReadOnly()
  async findManagementMode(input: ProtectedResourceRef): Promise<ResourceManagementMode | null> {
    const [record] = await this.connection
      .select({ managementMode: resourceManagement.managementMode })
      .from(resourceManagement)
      .where(
        and(
          eq(resourceManagement.organizationId, input.organizationId),
          eq(resourceManagement.resourceKind, input.resourceKind),
          eq(resourceManagement.resourceId, input.resourceId),
        ),
      )
      .limit(1);
    return record?.managementMode ?? null;
  }

  async deleteManagement(input: ProtectedResourceRef): Promise<boolean> {
    const rows = await this.connection
      .delete(resourceManagement)
      .where(
        and(
          eq(resourceManagement.organizationId, input.organizationId),
          eq(resourceManagement.resourceKind, input.resourceKind),
          eq(resourceManagement.resourceId, input.resourceId),
        ),
      )
      .returning({ id: resourceManagement.id });
    return rows.length > 0;
  }

  @ReadOnly()
  async findActiveByResource(
    input: ProtectedResourceRef,
  ): Promise<ServiceLinkedResourceBinding | null> {
    const [record] = await this.connection
      .select()
      .from(serviceLinkedResource)
      .where(
        and(
          eq(serviceLinkedResource.organizationId, input.organizationId),
          eq(serviceLinkedResource.resourceKind, input.resourceKind),
          eq(serviceLinkedResource.resourceId, input.resourceId),
          isNull(serviceLinkedResource.deletedAt),
        ),
      )
      .limit(1);
    return record ?? null;
  }

  @ReadOnly()
  async findActiveByResources(
    inputs: readonly ProtectedResourceRef[],
  ): Promise<ServiceLinkedResourceBinding[]> {
    if (inputs.length === 0) return [];
    const organizationIds = [...new Set(inputs.map((input) => input.organizationId))];
    const resourceKinds = [...new Set(inputs.map((input) => input.resourceKind))];
    const resourceIds = [...new Set(inputs.map((input) => input.resourceId))];
    const allowed = new Set(inputs.map(resourceKey));

    const records = await this.connection
      .select()
      .from(serviceLinkedResource)
      .where(
        and(
          inArray(serviceLinkedResource.organizationId, organizationIds),
          inArray(serviceLinkedResource.resourceKind, resourceKinds),
          inArray(serviceLinkedResource.resourceId, resourceIds),
          isNull(serviceLinkedResource.deletedAt),
        ),
      );

    return records.filter((record) => allowed.has(resourceKey(record)));
  }

  @ReadOnly()
  async findActiveLinkedOwner(input: LinkedOwnerRef): Promise<ServiceLinkedResourceBinding | null> {
    const [record] = await this.connection
      .select()
      .from(serviceLinkedResource)
      .where(
        and(
          eq(serviceLinkedResource.organizationId, input.organizationId),
          eq(serviceLinkedResource.resourceKind, input.resourceKind),
          eq(serviceLinkedResource.resourceId, input.resourceId),
          eq(serviceLinkedResource.linkedService, input.linkedService),
          eq(serviceLinkedResource.linkedOwnerType, input.linkedOwnerType),
          eq(serviceLinkedResource.linkedOwnerId, input.linkedOwnerId),
          isNull(serviceLinkedResource.deletedAt),
        ),
      )
      .limit(1);
    return record ?? null;
  }

  async createBinding(
    input: CreateServiceLinkedResourceBindingInput,
  ): Promise<ServiceLinkedResourceBinding> {
    const [record] = await this.connection
      .insert(serviceLinkedResource)
      .values({
        id: await this.generateUuidV7(),
        organizationId: input.organizationId,
        resourceKind: input.resourceKind,
        resourceId: input.resourceId,
        linkedService: input.linkedService,
        linkedOwnerType: input.linkedOwnerType,
        linkedOwnerId: input.linkedOwnerId,
        createdBy: input.createdBy ?? null,
      })
      .returning();
    if (!record) {
      throw new Error("Service-linked resource binding could not be created");
    }
    return record;
  }

  async softDeleteActiveLinkedOwner(input: LinkedOwnerRef): Promise<boolean> {
    const rows = await this.connection
      .update(serviceLinkedResource)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(serviceLinkedResource.organizationId, input.organizationId),
          eq(serviceLinkedResource.resourceKind, input.resourceKind),
          eq(serviceLinkedResource.resourceId, input.resourceId),
          eq(serviceLinkedResource.linkedService, input.linkedService),
          eq(serviceLinkedResource.linkedOwnerType, input.linkedOwnerType),
          eq(serviceLinkedResource.linkedOwnerId, input.linkedOwnerId),
          isNull(serviceLinkedResource.deletedAt),
        ),
      )
      .returning({ id: serviceLinkedResource.id });

    return rows.length > 0;
  }
}

function resourceKey(input: ProtectedResourceRef): string {
  return `${input.organizationId}:${input.resourceKind}:${input.resourceId}`;
}
