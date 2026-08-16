import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  Policy,
  ServiceBroker,
  FatalError,
  type WorkflowExecutionContext,
} from "@shopana/shared-kernel";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { IAM, Media } from "@shopana/broker-types";
import { v7 as uuidv7 } from "uuid";
import { Roles, RolesMeta } from "@shopana/rbac";
import { Kernel } from "../kernel/Kernel.js";
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
}

/**
 * Saga for store creation with compensation support.
 *
 * Steps:
 * 1. Generate store ID (UUIDv7)
 * 2. Create store record in database
 * 3. Create store roles
 * 4. Assign admin role to creator
 * 5. Create media asset group
 * 6. Emit storeCreated and initial storeConfigurationUpdated events
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
  @Policy<StoreCreateInput>({
    resource: "org.stores",
    action: "write",
    organizationId: (_self, input) => input.organizationId,
  })
  async run(
    input: StoreCreateInput,
    workflowContext?: WorkflowExecutionContext,
  ): Promise<StoreCreateOutput> {
    if (!workflowContext) {
      throw new Error("Workflow authorization context is required");
    }
    const storeId = await this.generateId();
    await this.createStore(storeId, input);
    await this.workflowCreateRoles(storeId, input, workflowContext);
    await this.workflowAssignAdminRole(storeId, input, workflowContext);
    await this.createMediaAssetGroup(storeId);
    await this.emitStoreCreated(storeId, input);
    await this.emitStoreConfigurationUpdated(storeId, input);
    return { storeId, organizationId: input.organizationId };
  }

  @SagaStep()
  private async generateId(): Promise<string> {
    return uuidv7();
  }

  @SagaStep()
  private async createStore(
    id: string,
    input: StoreCreateInput,
  ): Promise<void> {
    await this.kernel.repository.store.create({
      id,
      organizationId: input.organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencyCode: input.currencyCode,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  private async workflowCreateRoles(
    id: string,
    input: StoreCreateInput,
    workflowContext: WorkflowExecutionContext,
  ): Promise<void> {
    const result = await this.broker.runWorkflow<
      IAM.CreateRolesResult,
      IAM.CreateRolesParams
    >(
      "iam.createRoles",
      {
        userId: input.userId,
        organizationId: input.organizationId,
        domain: `store:${id}`,
        roles: buildStoreRoles(),
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "createRoles",
        callId: id,
      },
      { workflowContext },
    );

    if (result.success) return;

    throw new FatalError(
      result.error ?? "Failed to create roles",
      undefined,
      "ROLE_CREATE_FAILED",
    );
  }

  private async workflowAssignAdminRole(
    id: string,
    input: StoreCreateInput,
    workflowContext: WorkflowExecutionContext,
  ): Promise<void> {
    const result = await this.broker.runWorkflow<
      IAM.AssignRoleResult,
      IAM.AssignRoleParams
    >(
      "iam.assignRole",
      {
        userId: input.userId,
        organizationId: input.organizationId,
        domain: `store:${id}`,
        roleName: "admin",
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "assignAdminRole",
        callId: id,
      },
      { workflowContext },
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
          displayName: input.displayName,
          defaultLocale: input.locales[0],
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

  private async emitStoreConfigurationUpdated(
    id: string,
    input: StoreCreateInput,
  ): Promise<void> {
    const occurredAt = new Date().toISOString();
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "storeConfigurationUpdated",
        payload: {
          schemaVersion: 1,
          storeId: id,
          configurationRevision: 0,
          currencyCode: input.currencyCode,
          currencyExponent: currencyExponent(input.currencyCode),
          timeZone: input.timezone ?? "UTC",
          occurredAt,
        },
        context: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
        subject: { type: "store", id },
        actor: { type: "user", id: input.userId },
        emitKey: `store:${id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitStoreConfigurationUpdated",
        callId: id,
      },
    );
  }

  async compensateCreateStore(id: string): Promise<void> {
    await this.kernel.repository.store.delete(id);
    this.logger.log({ storeId: id }, "Compensated: deleted store");
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

function currencyExponent(currencyCode: string): number {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits;
}
