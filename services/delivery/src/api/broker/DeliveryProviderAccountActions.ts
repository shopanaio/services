import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  type ServiceBroker,
  ZodSchema,
} from "@shopana/shared-kernel";
import { DeliveryActionNames, type Delivery } from "@shopana/broker-types";
import { DeliveryLifecycleActionSchemas } from "../../contracts/schemas.js";
import {
  DeliveryProviderAccountService,
  deterministicDeliveryProviderAccountId,
} from "../../application/providers/DeliveryProviderAccountService.js";
import type { Repository } from "../../repositories/Repository.js";

@Injectable()
export class DeliveryProviderAccountActions extends BrokerActions {
  constructor(
    @InjectBroker("delivery") broker: ServiceBroker,
    private readonly accounts: DeliveryProviderAccountService,
    private readonly repository: Repository,
  ) {
    super(broker);
  }
  @Action(DeliveryActionNames.configureProviderAccount)
  @ZodSchema(DeliveryLifecycleActionSchemas.configureProviderAccount)
  async configureDeliveryProviderAccount(params: Delivery.ConfigureDeliveryProviderAccountParams) {
    const providerAccountId = deterministicDeliveryProviderAccountId(
      params.storeId,
      params.installationId,
    );
    const duplicate = await this.accounts.isConfigured(params);
    const started = await this.broker.startWorkflow(
      "delivery.configureProviderAccount",
      { params, providerAccountId },
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: params.installationId,
        operation: "delivery.configureProviderAccount",
        content: {
          storeId: params.storeId,
          installationId: params.installationId,
          enabledCapabilities: params.enabledCapabilities,
          mode: params.mode,
          idempotencyKey: params.idempotencyKey,
        },
      },
    );
    return { providerAccountId, workflowId: started.workflowId, duplicate };
  }
  @Action(DeliveryActionNames.setProviderCapabilityStatus)
  @ZodSchema(DeliveryLifecycleActionSchemas.setProviderCapabilityStatus)
  setDeliveryProviderCapabilityStatus(params: Delivery.SetDeliveryProviderCapabilityStatusParams) {
    return this.accounts.setStatus(params);
  }
  @Action(DeliveryActionNames.getProviderAccount)
  @ZodSchema(DeliveryLifecycleActionSchemas.getProviderAccount)
  async getDeliveryProviderAccount(
    params: Delivery.GetDeliveryProviderAccountParams,
  ): Promise<Delivery.GetDeliveryProviderAccountResult> {
    const account = await this.repository.providerAccounts.getById(
      params.storeId,
      params.providerAccountId,
    );
    if (!account) throw new Error("Delivery provider account not found");
    return { account };
  }
}
