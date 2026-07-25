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
import { SalesChannelConnectionStore } from "./SalesChannelConnectionStore.js";
import { SalesChannelLifecycleService } from "./SalesChannelLifecycleService.js";
import type { OnlineStoreBootstrapInput } from "./OnlineStoreBootstrapWorkflow.js";

@Injectable()
export class OnlineStoreDeprovisionWorkflow extends BrokerWorkflows<
  OnlineStoreBootstrapInput,
  void
> {
  constructor(
    @InjectBroker("apps") broker: ServiceBroker,
    private readonly installations: AppInstallationStore,
    private readonly connectionStore: SalesChannelConnectionStore,
    private readonly channels: SalesChannelLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("onlineStoreDeprovision", { idempotencyStrategy: "content" })
  async run(input: OnlineStoreBootstrapInput): Promise<void> {
    await this.disconnect(input.storeId);
    await this.uninstall(input.storeId);
  }

  @WorkflowStep()
  private async disconnect(storeId: string): Promise<void> {
    const installation = (
      await this.installations.listByStore(storeId, [
        "ACTIVE",
        "SUSPENDED",
        "UNINSTALL_FAILED",
      ])
    ).find((item) => item.appCode === "shopana-online-store");
    if (!installation) return;
    const connections =
      await this.connectionStore.listByInstallation(installation.id, false);
    for (const connection of connections) {
      const accepted = await this.channels.disconnect(
        connection.id,
        `store-delete:${storeId}:${connection.id}`,
        this.broker,
        undefined,
        storeId,
      );
      await this.broker
        .getWorkflowRegistry()
        .retrieve(accepted.workflowId)
        .getResult();
    }
  }

  @WorkflowStep()
  private async uninstall(storeId: string): Promise<void> {
    const installation = (
      await this.installations.listByStore(storeId, [
        "ACTIVE",
        "SUSPENDED",
        "UNINSTALL_FAILED",
      ])
    ).find((item) => item.appCode === "shopana-online-store");
    if (!installation) return;
    const accepted = await this.broker.call<
      Apps.AppLifecycleAcceptedResult,
      Apps.UninstallAppParams
    >("apps.uninstallApp", {
      installationId: installation.id,
      idempotencyKey: `store-delete:${storeId}:uninstall`,
      workflowId: `apps:uninstall:shopana-online-store:${storeId}`,
      system: true,
    });
    await this.broker
      .getWorkflowRegistry()
      .retrieve(accepted.workflowId)
      .getResult();
  }
}
