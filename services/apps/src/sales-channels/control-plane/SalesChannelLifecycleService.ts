import { Injectable } from "@nestjs/common";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { SalesChannelConnectionStore } from "./SalesChannelConnectionStore.js";
import type { SalesChannelLifecycleAccepted } from "./types.js";

@Injectable()
export class SalesChannelLifecycleService {
  constructor(private readonly store: SalesChannelConnectionStore) {}

  async createAndConnect(
    input: {
      readonly installationId: string;
      readonly specificationId: string;
      readonly displayName: string;
      readonly configuration?: Readonly<Record<string, unknown>>;
      readonly clientMutationId: string;
      readonly userId?: string;
      readonly correlationId?: string;
      readonly trustedStoreId?: string;
    },
    broker: ServiceBroker,
  ): Promise<SalesChannelLifecycleAccepted> {
    const begun = await this.store.beginConnect({
      installationId: input.installationId,
      specificationId: input.specificationId,
      displayName: input.displayName,
      configuration: input.configuration ?? {},
      idempotencyKey: input.clientMutationId,
      actor: input.userId
        ? { type: "USER", id: input.userId }
        : { type: "SYSTEM" },
      correlationId: input.correlationId,
      trustedStoreId: input.trustedStoreId,
    });
    return this.start(begun, undefined, broker);
  }

  update(
    input: {
      readonly connectionId: string;
      readonly configuration: Readonly<Record<string, unknown>>;
      readonly displayName?: string;
      readonly expectedConfigurationVersion: number;
      readonly targetSpecificationId?: string;
      readonly clientMutationId: string;
      readonly userId?: string;
      readonly correlationId?: string;
    },
    broker: ServiceBroker,
  ): Promise<SalesChannelLifecycleAccepted> {
    return this.begin(
      {
        connectionId: input.connectionId,
        type: "UPDATE",
        expectedStatuses: ["ACTIVE", "UPDATE_FAILED"],
        transitionStatus: "UPDATING",
        idempotencyKey: input.clientMutationId,
        actor: actor(input.userId),
        correlationId: input.correlationId,
        expectedConfigurationVersion: input.expectedConfigurationVersion,
        targetSpecificationId: input.targetSpecificationId,
        workflow: {
          configuration: input.configuration,
          displayName: input.displayName,
          expectedConfigurationVersion: input.expectedConfigurationVersion,
        },
      },
      broker,
    );
  }

  suspend(
    connectionId: string,
    clientMutationId: string,
    broker: ServiceBroker,
    userId?: string,
  ) {
    return this.begin(
      {
        connectionId,
        type: "SUSPEND",
        expectedStatuses: ["ACTIVE"],
        transitionStatus: "SUSPENDING",
        idempotencyKey: clientMutationId,
        actor: actor(userId),
      },
      broker,
    );
  }

  resume(
    connectionId: string,
    clientMutationId: string,
    broker: ServiceBroker,
    userId?: string,
  ) {
    return this.begin(
      {
        connectionId,
        type: "RESUME",
        expectedStatuses: ["SUSPENDED"],
        transitionStatus: "RESUMING",
        idempotencyKey: clientMutationId,
        actor: actor(userId),
      },
      broker,
    );
  }

  disconnect(
    connectionId: string,
    clientMutationId: string,
    broker: ServiceBroker,
    userId?: string,
    trustedStoreId?: string,
  ) {
    return this.begin(
      {
        connectionId,
        type: "DISCONNECT",
        expectedStatuses: [
          "DRAFT",
          "ACTIVE",
          "CONNECT_FAILED",
          "UPDATE_FAILED",
          "SUSPENDED",
          "DISCONNECT_FAILED",
        ],
        transitionStatus: "DISCONNECTING",
        idempotencyKey: clientMutationId,
        actor: actor(userId),
        trustedStoreId,
      },
      broker,
    );
  }

  private async begin(
    input: Parameters<SalesChannelConnectionStore["beginOperation"]>[0] & {
      readonly workflow?: {
        readonly configuration?: Readonly<Record<string, unknown>>;
        readonly displayName?: string;
        readonly expectedConfigurationVersion?: number;
      };
    },
    broker: ServiceBroker,
  ): Promise<SalesChannelLifecycleAccepted> {
    const begun = await this.store.beginOperation(input);
    return this.start(begun, input.workflow, broker);
  }

  private async start(
    begun: Awaited<ReturnType<SalesChannelConnectionStore["beginOperation"]>>,
    workflow:
      | {
          readonly configuration?: Readonly<Record<string, unknown>>;
          readonly displayName?: string;
          readonly expectedConfigurationVersion?: number;
        }
      | undefined,
    broker: ServiceBroker,
  ): Promise<SalesChannelLifecycleAccepted> {
    if (!begun.duplicate) {
      try {
        await broker.startWorkflow(
        "apps.salesChannelLifecycle",
        {
          connectionId: begun.connection.id,
          operationId: begun.operation.id,
          type: begun.operation.type,
          ...workflow,
        },
        {
          source: "content",
          organizationId: begun.connection.organizationId,
          resourceId: begun.connection.id,
          operation: `apps.sales-channel.${begun.operation.type.toLowerCase()}`,
          content: { operationId: begun.operation.id },
        },
        { workflowId: begun.operation.workflowId },
      );
      } catch (error) {
        await this.store.fail(begun.operation.id, error);
        throw error;
      }
    }
    return {
      connectionId: begun.connection.id,
      operationId: begun.operation.id,
      workflowId: begun.operation.workflowId,
      status: begun.connection.status,
      duplicate: begun.duplicate,
    };
  }
}

function actor(userId?: string) {
  return userId
    ? ({ type: "USER", id: userId } as const)
    : ({ type: "SYSTEM" } as const);
}
