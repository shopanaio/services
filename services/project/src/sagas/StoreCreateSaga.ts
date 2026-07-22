import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
  FatalError,
} from "@shopana/shared-kernel";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { IAM, Media } from "@shopana/broker-types";
import { v7 as uuidv7 } from "uuid";
import { Roles, RolesMeta } from "@shopana/rbac";
import { Kernel } from "../kernel/Kernel.js";
import { resolveStorefrontAuthUrls } from "../configuration/storefrontAuth.js";
import type {
  CurrencyCode,
  LocaleCode,
  StoreStatus,
} from "../repositories/models/index.js";

/** Convert @shopana/rbac Roles.store to RoleConfig[] for iam.createRoles */
function buildStoreRoles(): IAM.RoleConfig[] {
  return (Object.keys(Roles.store) as Array<keyof typeof Roles.store>).map(
    (roleName) => {
      const permissions = Roles.store[roleName];
      const meta = RolesMeta.store[roleName];
      return {
        name: roleName,
        displayName: meta.displayName,
        description: meta.description,
        permissions: permissions.map((p) => ({
          resource: p.resource,
          action: p.action,
        })),
      };
    },
  );
}

export interface StoreCreateInput {
  name: string;
  displayName: string;
  locales: LocaleCode[];
  currencyCode: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string;
  organizationId: string;
  userId: string;
}

export interface StoreCreateOutput {
  storeId: string;
  organizationId: string;
  applicationId: string;
}

/**
 * Saga for store creation with compensation support.
 *
 * Steps:
 * 1. Generate store ID (UUIDv7)
 * 2. Allocate IAM application ID
 * 3. Create IAM application
 * 4. Create store record in database
 * 5. Create store roles
 * 6. Assign admin role to creator
 * 7. Create media asset group
 * 8. Emit storeCreated event
 */
@Injectable()
export class StoreCreateSaga extends BrokerSaga<StoreCreateInput, StoreCreateOutput> {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("storeCreate")
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const storeId = await this.generateId();
    const applicationId = await this.allocateIamApplicationId();
    await this.createIamApplication(applicationId, storeId, input);
    await this.createStore(storeId, applicationId, input);
    await this.createRoles(storeId, input);
    await this.assignAdminRole(storeId, input);
    await this.createMediaAssetGroup(storeId);
    await this.emitStoreCreated(storeId, input);
    return { storeId, organizationId: input.organizationId, applicationId };
  }

  @SagaStep()
  private async generateId(): Promise<string> {
    return uuidv7();
  }

  @SagaStep()
  private async allocateIamApplicationId(): Promise<string> {
    const result = await this.broker.call<
      IAM.AllocateApplicationIdResult,
      IAM.AllocateApplicationIdParams
    >("iam.allocateApplicationId", {});

    if (result.success && result.applicationId) {
      return result.applicationId;
    }

    throw new FatalError(
      result.error ?? "Failed to allocate IAM application id",
      undefined,
      "APPLICATION_ID_ALLOCATE_FAILED",
    );
  }

  @SagaStep()
  private async createIamApplication(
    applicationId: string,
    storeId: string,
    input: StoreCreateInput,
  ): Promise<void> {
    const storefrontAuth = resolveStorefrontAuthUrls(input.name);
    const defaultLocale = toApplicationAuthLocale(input.locales[0]);
    const result = await this.broker.call<
      IAM.CreateApplicationResult,
      IAM.CreateApplicationParams
    >("iam.createApplication", {
      applicationId,
      userId: input.userId,
      organizationId: input.organizationId,
      name: input.name,
      displayName: input.displayName,
      description: `Store application for ${input.displayName}`,
      storefrontAuth: {
        ...storefrontAuth,
        defaultLocale,
      },
      managementMode: "service",
      linkedOwner: {
        linkedOwnerType: "store",
        linkedOwnerId: storeId,
      },
    });

    if (result.success) return;

    throw new FatalError(
      result.error ?? "Failed to create IAM application",
      undefined,
      "APPLICATION_CREATE_FAILED",
    );
  }

  @SagaStep()
  private async createStore(
    id: string,
    applicationId: string,
    input: StoreCreateInput,
  ): Promise<void> {
    await this.kernel.repository.store.create({
      id,
      organizationId: input.organizationId,
      applicationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencyCode: input.currencyCode,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
    timeoutMs: 10_000,
  })
  private async createRoles(id: string, input: StoreCreateInput): Promise<void> {
    const result = await this.broker.call<IAM.CreateRolesResult, IAM.CreateRolesParams>(
      "iam.createRoles",
      {
        userId: input.userId,
        organizationId: input.organizationId,
        domain: `store:${id}`,
        roles: buildStoreRoles(),
      },
    );

    if (result.success) return;

    throw new FatalError(
      result.error ?? "Failed to create roles",
      undefined,
      "ROLE_CREATE_FAILED",
    );
  }

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
    timeoutMs: 10_000,
  })
  private async assignAdminRole(id: string, input: StoreCreateInput): Promise<void> {
    const result = await this.broker.call<IAM.AssignRoleResult, IAM.AssignRoleParams>(
      "iam.assignRole",
      {
        userId: input.userId,
        organizationId: input.organizationId,
        domain: `store:${id}`,
        roleName: "admin",
      },
    );

    if (result.success) return;

    throw new FatalError(
      result.error ?? "Failed to assign admin role",
      undefined,
      "ROLE_ASSIGN_FAILED",
    );
  }

  @SagaStep()
  private async createMediaAssetGroup(id: string): Promise<void> {
    const result = await this.broker.call<
      Media.CreateAssetGroupResult,
      Media.CreateAssetGroupParams
    >("media.createAssetGroup", {
      ownerType: "store",
      ownerId: id,
    });

    if (result.userErrors.length > 0) {
      const message = result.userErrors[0]?.message ?? "Media asset group failed";
      throw new Error(message);
    }
  }

  private async emitStoreCreated(id: string, input: StoreCreateInput): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "storeCreated",
        payload: {
          storeId: id,
          organizationId: input.organizationId,
          name: input.name,
        },
        context: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
        subject: { type: "store", id },
        actor: input.userId ? { type: "user", id: input.userId } : undefined,
        emitKey: `store:${id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitStoreCreated",
        callId: id,
      },
    );
  }

  async compensateCreateStore(id: string): Promise<void> {
    await this.kernel.repository.store.delete(id);
    this.logger.log({ storeId: id }, "Compensated: deleted store");
  }

  async compensateCreateIamApplication(
    applicationId: string,
    storeId: string,
    input: StoreCreateInput,
  ): Promise<void> {
    try {
      const result = await this.broker.call<
        IAM.DeleteApplicationForStoreCreateCompensationResult,
        IAM.DeleteApplicationForStoreCreateCompensationParams
      >("iam.deleteApplicationForStoreCreateCompensation", {
        applicationId,
        organizationId: input.organizationId,
        storeId,
      });
      if (!result.success) {
        throw new Error(
          result.error ?? "Failed to compensate IAM application",
        );
      }
      this.logger.log(
        { applicationId, storeId },
        "Compensated: deleted IAM application",
      );
    } catch (error) {
      this.logger.warn(
        { applicationId, storeId, error },
        "Failed to compensate IAM application",
      );
      throw error;
    }
  }

  async compensateCreateMediaAssetGroup(id: string): Promise<void> {
    try {
      await this.broker.call<
        Media.DeleteAssetGroupResult,
        Media.DeleteAssetGroupParams
      >("media.deleteAssetGroup", {
        ownerType: "store",
        ownerId: id,
      });
      this.logger.log({ storeId: id }, "Compensated: deleted media asset group");
    } catch (error) {
      this.logger.warn({ storeId: id, error }, "Failed to compensate media asset group");
    }
  }
}

function toApplicationAuthLocale(locale: LocaleCode | undefined): "en" | "uk" | "ru" {
  return locale === "uk" || locale === "ru" ? locale : "en";
}
