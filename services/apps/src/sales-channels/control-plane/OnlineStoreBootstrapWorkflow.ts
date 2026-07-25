import { Injectable } from "@nestjs/common";
import type { Apps } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { AppInstallationStore } from "../../control-plane/AppInstallationStore.js";
import { Repository } from "../../repositories/Repository.js";
import { SalesChannelLifecycleService } from "./SalesChannelLifecycleService.js";

export interface OnlineStoreBootstrapInput {
  readonly storeId: string;
  readonly organizationId: string;
}

@Injectable()
export class OnlineStoreBootstrapWorkflow extends BrokerWorkflows<
  OnlineStoreBootstrapInput,
  { installationId: string; connectionId: string }
> {
  constructor(
    @InjectBroker("apps") broker: ServiceBroker,
    private readonly installations: AppInstallationStore,
    private readonly repository: Repository,
    private readonly channels: SalesChannelLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("onlineStoreBootstrap", { idempotencyStrategy: "content" })
  async run(input: OnlineStoreBootstrapInput) {
    const installationId = await this.ensureInstallation(input);
    const connectionId = await this.ensureConnection(input, installationId);
    return { installationId, connectionId };
  }

  @WorkflowStep()
  private async ensureInstallation(
    input: OnlineStoreBootstrapInput,
  ): Promise<string> {
    const existing = (
      await this.installations.listByStore(input.storeId, [
        "INSTALLING",
        "ACTIVE",
        "INSTALL_FAILED",
      ])
    ).find((item) => item.appCode === "shopana-online-store");
    if (existing?.status === "ACTIVE") return existing.id;

    const accepted = await this.broker.call<
      Apps.AppLifecycleAcceptedResult,
      Apps.InstallAppParams
    >("apps.installApp", {
      appCode: "shopana-online-store",
      organizationId: input.organizationId,
      storeId: input.storeId,
      configuration: {},
      grantedScopes: [],
      idempotencyKey: `online-store-install:${input.storeId}`,
      workflowId: `apps:install:shopana-online-store:${input.storeId}`,
      system: true,
    });
    await this.broker
      .getWorkflowRegistry()
      .retrieve(accepted.workflowId)
      .getResult();
    return accepted.installationId;
  }

  @WorkflowStep()
  private async ensureConnection(
    input: OnlineStoreBootstrapInput,
    installationId: string,
  ): Promise<string> {
    const specification =
      await this.repository.salesChannelSpecification.findCurrent(
        installationId,
        "online-store",
      );
    if (!specification) {
      throw new Error("Online Store sales channel specification not found");
    }
    const existing = (
      await this.repository.salesChannelConnection.listByInstallation(
        installationId,
        false,
      )
    ).find(
      (connection) =>
        connection.specificationSnapshotId === specification.id,
    );
    if (existing?.status === "ACTIVE") return existing.id;

    const accepted = await this.channels.createAndConnect(
      {
        installationId,
        specificationId: specification.id,
        displayName: "Online Store",
        configuration: {},
        clientMutationId: `online-store-connect:${input.storeId}`,
        trustedStoreId: input.storeId,
        workflowId: `apps:channel:online-store:${input.storeId}`,
      },
      this.broker,
    );
    await this.broker
      .getWorkflowRegistry()
      .retrieve(accepted.workflowId)
      .getResult();
    return accepted.connectionId;
  }
}
