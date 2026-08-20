import { Injectable } from "@nestjs/common";
import type { IAM } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  FatalError,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";

export interface StorefrontAuthDeprovisionInput {
  storeId: string;
  organizationId: string;
}

@Injectable()
export class StorefrontAuthDeprovisionWorkflow extends BrokerWorkflows<
  StorefrontAuthDeprovisionInput,
  void
> {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontAuthDeprovision")
  async run(input: StorefrontAuthDeprovisionInput): Promise<void> {
    const applicationId = await this.findApplicationId(input);
    if (!applicationId) return;

    await this.deleteIamApplication(applicationId, input);
    await this.deleteConfiguration(input);
  }

  @WorkflowStep()
  private async findApplicationId(input: StorefrontAuthDeprovisionInput): Promise<string | null> {
    const configuration = await Kernel.getInstance().repository.storefrontAuth.findByStoreId(
      input.storeId,
    );
    if (!configuration) return null;
    if (configuration.organizationId !== input.organizationId) {
      throw new FatalError(
        "Storefront auth organization does not match store event",
        undefined,
        "STOREFRONT_AUTH_ORGANIZATION_MISMATCH",
      );
    }
    return configuration.applicationId;
  }

  @WorkflowStep()
  private async deleteIamApplication(
    applicationId: string,
    input: StorefrontAuthDeprovisionInput,
  ): Promise<void> {
    const result = await this.broker.call<
      IAM.DeleteServiceLinkedApplicationResult,
      IAM.DeleteServiceLinkedApplicationParams
    >("iam.deleteServiceLinkedApplication", {
      applicationId,
      organizationId: input.organizationId,
      linkedOwner: {
        linkedOwnerType: "store",
        linkedOwnerId: input.storeId,
      },
    });

    if (!result.success) {
      throw new FatalError(
        result.error ?? "Failed to delete storefront IAM application",
        undefined,
        "APPLICATION_DELETE_FAILED",
      );
    }
  }

  @WorkflowStep()
  private async deleteConfiguration(input: StorefrontAuthDeprovisionInput): Promise<void> {
    await Kernel.getInstance().repository.storefrontAuth.delete(input);
  }
}
