import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { HeadlessType } from "./HeadlessType.js";
import { HeadlessStorefrontConnectionResolver } from "./HeadlessStorefrontConnectionResolver.js";
import { StorefrontAccessPolicyResolver } from "./StorefrontAccessPolicyResolver.js";
import { StorefrontCredentialResolver } from "./StorefrontCredentialResolver.js";

interface ClientMutationInput {
  readonly clientMutationId: string;
}

export class MutationResolver extends HeadlessType<Record<string, never>> {
  headlessAppMutation() {
    return new HeadlessAppMutationResolver({}, this.$ctx);
  }
}

export class HeadlessAppMutationResolver extends HeadlessType<
  Record<string, never>
> {
  async headlessStorefrontCreate(args: {
    input: ClientMutationInput & { displayName: string };
  }) {
    return this.payload(async () => {
      const created = await this.$ctx.connections.createConnection(
        this.scope,
        {
          displayName: args.input.displayName,
          clientMutationId: args.input.clientMutationId,
          createdById: this.$ctx.app.actor?.id,
        },
      );
      return {
        connection: new HeadlessStorefrontConnectionResolver(
          created.connection.id,
          this.$ctx,
        ),
        duplicate: created.duplicate,
        initialStorefrontCredentials: created.initialCredentials
          ? {
              publicAccessToken:
                created.initialCredentials.publicAccessToken,
              privateAccessToken:
                created.initialCredentials.privateAccessToken,
            }
          : null,
      };
    }, { connection: null, duplicate: false, initialStorefrontCredentials: null });
  }

  async headlessStorefrontUpdate(args: {
    input: ClientMutationInput & {
      connectionId: string;
      displayName: string;
    };
  }) {
    return this.connectionPayload(async () =>
      this.$ctx.connections.updateConnection(
        this.scope,
        this.connectionId(args.input.connectionId),
        args.input.displayName,
      ),
    );
  }

  async headlessStorefrontSuspend(args: {
    input: ClientMutationInput & { connectionId: string };
  }) {
    return this.connectionPayload(async () =>
      this.$ctx.connections.suspendConnection(
        this.scope,
        this.connectionId(args.input.connectionId),
      ),
    );
  }

  async headlessStorefrontResume(args: {
    input: ClientMutationInput & { connectionId: string };
  }) {
    return this.connectionPayload(async () =>
      this.$ctx.connections.resumeConnection(
        this.scope,
        this.connectionId(args.input.connectionId),
      ),
    );
  }

  async headlessStorefrontDisconnect(args: {
    input: ClientMutationInput & { connectionId: string };
  }) {
    return this.connectionPayload(async () =>
      this.$ctx.connections.disconnectConnection(
        this.scope,
        this.connectionId(args.input.connectionId),
        this.actor,
      ),
    );
  }

  async storefrontPrivateCredentialCreate(args: {
    input: ClientMutationInput & {
      connectionId: string;
      label: string;
    };
  }) {
    return this.payload(async () => {
      const result = await this.$ctx.credentials.createPrivateCredential(
        this.scope,
        {
          connectionId: this.connectionId(args.input.connectionId),
          label: args.input.label.trim(),
          clientMutationId: args.input.clientMutationId,
          actor: this.actor,
        },
      );
      return {
        credential: new StorefrontCredentialResolver(
          result.credential.id,
          this.$ctx,
        ),
        privateAccessToken: result.privateAccessToken,
      };
    }, { credential: null, privateAccessToken: null });
  }

  async storefrontCredentialRevoke(args: {
    input: ClientMutationInput & { credentialId: string };
  }) {
    return this.payload(async () => {
      const id = this.decodeId(
        args.input.credentialId,
        GlobalIdEntity.StorefrontCredential,
      );
      const before = await this.$ctx.repository.credential.findById(
        this.scope,
        id,
      );
      const credential = await this.$ctx.credentials.revokePrivate(
        this.scope,
        { credentialId: id, actor: this.actor },
      );
      return {
        credential: new StorefrontCredentialResolver(
          credential.id,
          this.$ctx,
        ),
        duplicate: before?.status === "REVOKED",
      };
    }, { credential: null, duplicate: false });
  }

  async storefrontAccessPolicyUpdate(args: {
    input: ClientMutationInput & {
      connectionId: string;
      permissions: string[];
      expectedRevision: number;
    };
  }) {
    return this.payload(async () => {
      const connectionId = this.connectionId(args.input.connectionId);
      await this.$ctx.policies.replace(this.scope, {
        connectionId,
        permissions: args.input.permissions,
        expectedRevision: args.input.expectedRevision,
      });
      return {
        policy: new StorefrontAccessPolicyResolver(
          connectionId,
          this.$ctx,
        ),
      };
    }, { policy: null });
  }

  private connectionPayload(
    operation: () => Promise<{ readonly id: string }>,
  ) {
    return this.payload(async () => {
      const connection = await operation();
      return {
        connection: new HeadlessStorefrontConnectionResolver(
          connection.id,
          this.$ctx,
        ),
        duplicate: false,
      };
    }, { connection: null, duplicate: false });
  }

  private async payload(
    operation: () => Promise<Record<string, unknown>>,
    empty: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      return { ...(await operation()), userErrors: [] };
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "STOREFRONT_OPERATION_FAILED";
      return {
        ...empty,
        userErrors: [{
          code,
          message: userMessage(code),
          field: null,
        }],
      };
    }
  }

  private connectionId(value: string): string {
    return this.decodeId(
      value,
      GlobalIdEntity.HeadlessStorefrontConnection,
    );
  }

  private get actor() {
    return this.$ctx.app.actor ?? { type: "USER" as const };
  }
}

function userMessage(code: string): string {
  switch (code) {
    case "STOREFRONT_NOT_FOUND":
    case "STOREFRONT_CREDENTIAL_NOT_FOUND":
      return "Storefront resource was not found";
    case "STOREFRONT_POLICY_REVISION_CONFLICT":
      return "The access policy changed; reload and try again";
    case "STOREFRONT_PERMISSION_INVALID":
      return "The permission list contains an unsupported value";
    case "STOREFRONT_DISPLAY_NAME_INVALID":
      return "Display name is required and must not exceed 255 characters";
    case "STOREFRONT_CREDENTIAL_LABEL_INVALID":
      return "Credential label is required and must not exceed 255 characters";
    default:
      return "The storefront operation could not be completed";
  }
}
