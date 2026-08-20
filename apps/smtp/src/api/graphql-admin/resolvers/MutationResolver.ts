import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { SmtpConnectionInput, SmtpConnectionProvider } from "../../../connections/index.js";
import { SmtpConnectionResolver } from "./SmtpConnectionResolver.js";
import { SmtpType } from "./SmtpType.js";

type GraphqlConnectionInput = {
  readonly displayName: string;
  readonly provider: SmtpConnectionProvider;
  readonly host: string;
  readonly port: number;
  readonly security: "NONE" | "STARTTLS" | "TLS";
  readonly username?: string | null;
  readonly password?: string | null;
};

export class MutationResolver extends SmtpType<Record<string, never>> {
  smtpAppMutation() {
    return new SmtpAppMutationResolver({}, this.$ctx);
  }
}

export class SmtpAppMutationResolver extends SmtpType<Record<string, never>> {
  smtpConnectionCreate(args: { input: GraphqlConnectionInput }) {
    return this.connectionPayload(() =>
      this.$ctx.connections.create(this.scope, mapInput(args.input), this.$ctx.app.actor?.id),
    );
  }

  smtpConnectionUpdate(args: {
    input: GraphqlConnectionInput & { readonly connectionId: string };
  }) {
    return this.connectionPayload(() =>
      this.$ctx.connections.update(
        this.scope,
        this.connectionId(args.input.connectionId),
        mapInput(args.input),
      ),
    );
  }

  smtpConnectionActivate(args: { input: { readonly connectionId: string } }) {
    return this.connectionPayload(() =>
      this.$ctx.connections.activate(this.scope, this.connectionId(args.input.connectionId)),
    );
  }

  smtpConnectionDisconnect(args: { input: { readonly connectionId: string } }) {
    return this.connectionPayload(() =>
      this.$ctx.connections.disconnect(this.scope, this.connectionId(args.input.connectionId)),
    );
  }

  private async connectionPayload(operation: () => Promise<{ readonly id: string }>) {
    try {
      const connection = await operation();
      return {
        connection: new SmtpConnectionResolver(connection.id, this.$ctx),
        userErrors: [],
      };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error && typeof error.code === "string"
          ? error.code
          : error instanceof Error
            ? error.message
            : "SMTP_CONNECTION_OPERATION_FAILED";
      return {
        connection: null,
        userErrors: [
          {
            code,
            message: userMessage(code),
            field: null,
          },
        ],
      };
    }
  }

  private connectionId(value: string): string {
    return this.decodeId(value, GlobalIdEntity.SmtpConnection);
  }
}

function mapInput(input: GraphqlConnectionInput): SmtpConnectionInput {
  return {
    displayName: input.displayName,
    provider: input.provider,
    host: input.host,
    port: input.port,
    security: input.security,
    username: input.username,
    ...(Object.prototype.hasOwnProperty.call(input, "password")
      ? { password: input.password }
      : {}),
  };
}

function userMessage(code: string): string {
  switch (code) {
    case "SMTP_CONNECTION_NOT_FOUND":
      return "SMTP connection was not found";
    case "SMTP_CONNECTION_INVALID_STATE":
      return "Disconnected SMTP connection cannot be changed";
    case "SMTP_CONNECTION_DISPLAY_NAME_INVALID":
      return "Display name is required and must not exceed 255 characters";
    case "SMTP_CONNECTION_PASSWORD_REQUIRED":
      return "A password or API key is required when a username is configured";
    case "SMTP_CONNECTION_USERNAME_REQUIRED":
      return "A username is required for this email provider";
    case "SMTP_PASSWORD_INVALID":
      return "Password or API key must contain between 1 and 4096 characters";
    case "SMTP_CONFIGURATION_INVALID":
      return "SMTP host, port, security, or username is invalid";
    default:
      return "The SMTP connection operation could not be completed";
  }
}
