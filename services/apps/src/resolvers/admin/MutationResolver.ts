import { ApolloMutation } from "@shopana/type-resolver";
import { AppsType } from "./AppsType.js";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import {
  SalesChannelConnectionResolver,
  SalesChannelOperationResolver,
} from "./SalesChannelResolvers.js";

@ApolloMutation
export class MutationResolver extends AppsType<Record<string, never>> {
  appsMutation() {
    return new AppsMutationResolver({}, this.$ctx);
  }
}

/**
 * Namespace resolver. Domain mutation fields are added here as they are implemented.
 */
export class AppsMutationResolver extends AppsType<Record<string, never>> {
  async salesChannelConnectionCreate(args: {
    input: {
      installationId: string;
      specificationId: string;
      displayName: string;
      configuration?: Record<string, unknown>;
      clientMutationId: string;
    };
  }) {
    return this.salesChannelPayload(async () =>
      this.$ctx.salesChannelLifecycle.createAndConnect(
        {
          installationId: decodeGlobalIdByType(
            args.input.installationId,
            GlobalIdEntity.AppInstallation,
          ),
          specificationId: decodeGlobalIdByType(
            args.input.specificationId,
            GlobalIdEntity.SalesChannelSpecification,
          ),
          displayName: args.input.displayName,
          configuration: args.input.configuration,
          clientMutationId: args.input.clientMutationId,
          userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
          correlationId: this.$ctx.requestId,
        },
        this.$ctx.broker,
      ),
    );
  }

  async salesChannelConnectionUpdate(args: {
    input: {
      connectionId: string;
      displayName?: string;
      configuration: Record<string, unknown>;
      expectedConfigurationVersion: number;
      targetSpecificationId?: string;
      clientMutationId: string;
    };
  }) {
    return this.salesChannelPayload(() =>
      this.$ctx.salesChannelLifecycle.update(
        {
          connectionId: decodeGlobalIdByType(
            args.input.connectionId,
            GlobalIdEntity.SalesChannelConnection,
          ),
          displayName: args.input.displayName,
          configuration: args.input.configuration,
          expectedConfigurationVersion:
            args.input.expectedConfigurationVersion,
          targetSpecificationId: args.input.targetSpecificationId
            ? decodeGlobalIdByType(
                args.input.targetSpecificationId,
                GlobalIdEntity.SalesChannelSpecification,
              )
            : undefined,
          clientMutationId: args.input.clientMutationId,
          userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
          correlationId: this.$ctx.requestId,
        },
        this.$ctx.broker,
      ),
    );
  }

  salesChannelConnectionSuspend(args: {
    input: { connectionId: string; clientMutationId: string };
  }) {
    return this.actionPayload(args.input, "suspend");
  }

  salesChannelConnectionResume(args: {
    input: { connectionId: string; clientMutationId: string };
  }) {
    return this.actionPayload(args.input, "resume");
  }

  salesChannelConnectionDisconnect(args: {
    input: { connectionId: string; clientMutationId: string };
  }) {
    return this.actionPayload(args.input, "disconnect");
  }

  private actionPayload(
    input: { connectionId: string; clientMutationId: string },
    action: "suspend" | "resume" | "disconnect",
  ) {
    const connectionId = decodeGlobalIdByType(
      input.connectionId,
      GlobalIdEntity.SalesChannelConnection,
    );
    return this.salesChannelPayload(() =>
      this.$ctx.salesChannelLifecycle[action](
        connectionId,
        input.clientMutationId,
        this.$ctx.broker,
        this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      ),
    );
  }

  private async salesChannelPayload(
    action: () => Promise<{
      connectionId: string;
      operationId: string;
      duplicate: boolean;
    }>,
  ) {
    try {
      const accepted = await action();
      const [connection, operation] = await Promise.all([
        this.$ctx.repository.salesChannelConnection.findByIdForStore(
          accepted.connectionId,
        ),
        this.$ctx.repository.salesChannelOperation.findById(
          accepted.operationId,
        ),
      ]);
      return {
        connection: connection
          ? new SalesChannelConnectionResolver(connection, this.$ctx)
          : null,
        operation: operation
          ? new SalesChannelOperationResolver(operation, this.$ctx)
          : null,
        duplicate: accepted.duplicate,
        userErrors: [],
      };
    } catch (error) {
      return {
        connection: null,
        operation: null,
        duplicate: false,
        userErrors: [
          {
            code: "SALES_CHANNEL_ERROR",
            message: error instanceof Error ? error.message : String(error),
            field: null,
          },
        ],
      };
    }
  }
}
