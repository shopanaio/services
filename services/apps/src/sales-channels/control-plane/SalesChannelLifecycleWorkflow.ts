import { Injectable } from "@nestjs/common";
import type {
  SalesChannelActionInput,
  SalesChannelConnectInput,
  SalesChannelConnectResult,
  SalesChannelUpdateInput,
  SalesChannelUpdateResult,
} from "@shopana/app-sdk";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Repository } from "../../repositories/Repository.js";
import { SalesChannelRuntimeRouter } from "../runtime/SalesChannelRuntimeRouter.js";
import { SalesChannelConnectionStore } from "./SalesChannelConnectionStore.js";
import type { SalesChannelLifecycleWorkflowInput } from "./types.js";

@Injectable()
export class SalesChannelLifecycleWorkflow extends BrokerWorkflows<
  SalesChannelLifecycleWorkflowInput,
  { connectionId: string; status: string }
> {
  constructor(
    @InjectBroker("apps") broker: ServiceBroker,
    private readonly store: SalesChannelConnectionStore,
    private readonly repository: Repository,
    private readonly router: SalesChannelRuntimeRouter,
  ) {
    super(broker);
  }

  @Workflow("salesChannelLifecycle", {
    idempotencyStrategy: "content",
  })
  async run(input: SalesChannelLifecycleWorkflowInput) {
    await this.markRunning(input.operationId);
    try {
      if (input.type === "CONNECT") {
        await this.emitEvent(
          input.operationId,
          "apps.sales-channel.connection.created.v1",
          "created",
        );
      }
      const result = await this.dispatch(input);
      const completed = await this.complete(input, result);
      await this.emitLifecycleEvent(input.operationId);
      return { connectionId: completed.id, status: completed.status };
    } catch (error) {
      await this.fail(input.operationId, error);
      throw error;
    }
  }

  @WorkflowStep()
  private markRunning(operationId: string) {
    return this.store.markRunning(operationId);
  }

  @WorkflowStep()
  private async dispatch(
    input: SalesChannelLifecycleWorkflowInput,
  ): Promise<SalesChannelConnectResult | undefined> {
    const connection = await this.store.findById(input.connectionId);
    const operation = await this.store.findOperation(input.operationId);
    if (!connection || !operation || operation.connectionId !== connection.id) {
      throw new Error("Sales channel lifecycle workflow input is invalid");
    }
    const specification =
      await this.repository.salesChannelSpecification.findById(
        operation.targetSpecificationId ??
          connection.specificationSnapshotId,
      );
    if (!specification) {
      throw new Error("Sales channel specification not found");
    }
    const common = {
      connectionId: connection.id,
      specificationHandle: specification.handle,
    };
    const options = {
      operationId: operation.id,
      correlationId: operation.correlationId ?? undefined,
      allowTransitional: true,
      targetSpecificationId:
        operation.targetSpecificationId ?? undefined,
    };
    switch (operation.type) {
      case "CONNECT":
        return this.router.invokeForConnection<
          SalesChannelConnectResult,
          SalesChannelConnectInput
        >(
          connection.id,
          "connect",
          { ...common, configuration: connection.configuration },
          options,
        );
      case "UPDATE":
        return this.router.invokeForConnection<
          SalesChannelUpdateResult,
          SalesChannelUpdateInput
        >(
          connection.id,
          "update",
          {
            ...common,
            configuration: input.configuration ?? connection.configuration,
            previousConfigurationVersion: connection.configurationVersion,
          },
          options,
        );
      case "SUSPEND":
        await this.router.invokeForConnection<void, SalesChannelActionInput>(
          connection.id,
          "suspend",
          common,
          options,
        );
        return;
      case "RESUME":
        await this.router.invokeForConnection<void, SalesChannelActionInput>(
          connection.id,
          "resume",
          common,
          options,
        );
        return;
      case "DISCONNECT":
        await this.router.invokeForConnection<void, SalesChannelActionInput>(
          connection.id,
          "disconnect",
          common,
          options,
        );
        return;
    }
  }

  @WorkflowStep()
  private complete(
    input: SalesChannelLifecycleWorkflowInput,
    result: SalesChannelConnectResult | undefined,
  ) {
    return this.store.complete(input.operationId, {
      ...result,
      displayName: input.displayName,
      configuration:
        input.type === "UPDATE"
          ? result?.configuration ?? input.configuration
          : result?.configuration,
    });
  }

  private async emitLifecycleEvent(operationId: string): Promise<void> {
    const operation = await this.store.findOperation(operationId);
    if (!operation) return;
    const eventName = {
      CONNECT: "apps.sales-channel.connection.activated.v1",
      UPDATE: "apps.sales-channel.connection.updated.v1",
      SUSPEND: "apps.sales-channel.connection.suspended.v1",
      RESUME: "apps.sales-channel.connection.resumed.v1",
      DISCONNECT: "apps.sales-channel.connection.disconnected.v1",
    }[operation.type];
    await this.emitEvent(operationId, eventName, "completed");
  }

  @WorkflowStep()
  private async emitEvent(
    operationId: string,
    eventName: string,
    phase: string,
  ): Promise<void> {
    const operation = await this.store.findOperation(operationId);
    if (!operation) return;
    const connection = await this.store.findById(operation.connectionId);
    if (!connection) return;
    const specification =
      await this.repository.salesChannelSpecification.findById(
        connection.specificationSnapshotId,
      );
    if (!specification) return;
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: eventName,
        payload: {
          organizationId: connection.organizationId,
          storeId: connection.storeId,
          connectionId: connection.id,
          installationId: connection.installationId,
          appCode: specification.appCode,
          specificationHandle: specification.handle,
          correlationId: operation.correlationId ?? undefined,
        },
        context: { organizationId: connection.organizationId },
        subject: { type: "salesChannelConnection", id: connection.id },
        emitKey: `${connection.id}:${operation.id}:${phase}`,
      },
      {
        source: "workflow",
        workflowId: operation.workflowId,
        stepId: `emitLifecycleEvent:${phase}`,
        callId: `${operation.id}:${phase}`,
      },
    );
  }

  @WorkflowStep({ retriesAllowed: false })
  private fail(operationId: string, error: unknown) {
    return this.store.fail(operationId, error);
  }
}
