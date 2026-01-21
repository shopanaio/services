import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
  FatalError,
} from "@shopana/shared-kernel";
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
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
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

@Injectable()
export class StoreCreateSaga extends BrokerSaga<StoreCreateInput, StoreCreateOutput> {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("storeCreateSaga")
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const storeId = await this.generateId();
    await this.createStore(storeId, input);
    await this.createRoles(storeId, input);
    await this.createMediaAssetGroup(storeId); // non-critical
    return { storeId, organizationId: input.organizationId };
  }

  @SagaStep()
  private async generateId(): Promise<string> {
    return uuidv7();
  }

  @SagaStep({ critical: true })
  private async createStore(id: string, input: StoreCreateInput): Promise<void> {
    await this.kernel.repository.store.create({
      id,
      organizationId: input.organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  @SagaStep({
    compensate: false,
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
    critical: false,
  })
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
