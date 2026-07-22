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
import { resolveStorefrontAuthUrls } from "../configuration/storefrontAuth.js";
import { Kernel } from "../kernel/Kernel.js";

export interface StorefrontAuthProvisionInput {
  storeId: string;
  organizationId: string;
  userId: string;
  name: string;
  displayName: string;
  defaultLocale: string;
}

export interface StorefrontAuthProvisionOutput {
  applicationId: string;
}

@Injectable()
export class StorefrontAuthProvisionWorkflow extends BrokerWorkflows<
  StorefrontAuthProvisionInput,
  StorefrontAuthProvisionOutput
> {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("storefrontAuthProvision")
  async run(
    input: StorefrontAuthProvisionInput,
  ): Promise<StorefrontAuthProvisionOutput> {
    const applicationId = await this.resolveApplicationId(input);
    await this.createIamApplication(applicationId, input);
    return { applicationId };
  }

  @WorkflowStep()
  private async resolveApplicationId(
    input: StorefrontAuthProvisionInput,
  ): Promise<string> {
    const repository = Kernel.getInstance().repository.storefrontAuth;
    const existing = await repository.findByStoreId(input.storeId);
    if (existing) {
      if (existing.organizationId !== input.organizationId) {
        throw new FatalError(
          "Storefront auth organization does not match store event",
          undefined,
          "STOREFRONT_AUTH_ORGANIZATION_MISMATCH",
        );
      }
      return existing.applicationId;
    }

    const result = await this.broker.call<
      IAM.AllocateApplicationIdResult,
      IAM.AllocateApplicationIdParams
    >("iam.allocateApplicationId", {});
    if (!result.success || !result.applicationId) {
      throw new FatalError(
        result.error ?? "Failed to allocate IAM application id",
        undefined,
        "APPLICATION_ID_ALLOCATE_FAILED",
      );
    }

    const configuration = await repository.createIfAbsent({
      storeId: input.storeId,
      organizationId: input.organizationId,
      applicationId: result.applicationId,
    });
    return configuration.applicationId;
  }

  @WorkflowStep()
  private async createIamApplication(
    applicationId: string,
    input: StorefrontAuthProvisionInput,
  ): Promise<void> {
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
        ...resolveStorefrontAuthUrls(input.name),
        defaultLocale: toApplicationAuthLocale(input.defaultLocale),
      },
      managementMode: "service",
      linkedOwner: {
        linkedOwnerType: "store",
        linkedOwnerId: input.storeId,
      },
    });

    if (!result.success) {
      throw new FatalError(
        result.error ?? "Failed to create IAM application",
        undefined,
        "APPLICATION_CREATE_FAILED",
      );
    }
  }
}

function toApplicationAuthLocale(locale: string): "en" | "uk" | "ru" {
  return locale === "uk" || locale === "ru" ? locale : "en";
}
