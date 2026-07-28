import {
  parseSmtpConfiguration,
  type SmtpDeploymentPolicy,
  validateSmtpPassword,
} from "../configuration.js";
import type { SmtpConnectionProvider } from "./models/index.js";
import { SmtpCredentialCrypto } from "./SmtpCredentialCrypto.js";
import type { SmtpRepository } from "./Repository.js";
import type {
  SmtpConnectionRecord,
  SmtpConnectionScope,
  SmtpConnectionSecretRecord,
} from "./types.js";

export interface SmtpConnectionInput {
  readonly displayName: string;
  readonly provider: SmtpConnectionProvider;
  readonly host: string;
  readonly port: number;
  readonly security: "NONE" | "STARTTLS" | "TLS";
  readonly username?: string | null;
  readonly password?: string | null;
}

export class SmtpConnectionService {
  constructor(
    private readonly repository: SmtpRepository,
    private readonly crypto: SmtpCredentialCrypto,
    private readonly policy: SmtpDeploymentPolicy,
  ) {}

  list(scope: SmtpConnectionScope) {
    return this.repository.connection.list(scope);
  }

  findById(scope: SmtpConnectionScope, connectionId: string) {
    return this.repository.connection.findById(scope, connectionId);
  }

  findActiveSecret(scope: SmtpConnectionScope) {
    return this.repository.connection.findActive(scope);
  }

  async create(
    scope: SmtpConnectionScope,
    input: SmtpConnectionInput,
    createdById?: string,
  ): Promise<SmtpConnectionRecord> {
    const normalized = normalizeInput(input, this.policy, true);
    return this.repository.runInTransaction(async () => {
      const active = await this.repository.connection.findActive(scope);
      const created = await this.repository.connection.create(scope, {
        ...normalized.configuration,
        displayName: normalized.displayName,
        provider: input.provider,
        status: active ? "INACTIVE" : "ACTIVE",
        createdById,
      });
      if (normalized.password) {
        await this.repository.connection.updatePasswordEnvelope(
          scope,
          created.id,
          this.crypto.encrypt(normalized.password, {
            storeId: scope.storeId,
            connectionId: created.id,
          }),
        );
      }
      return required(
        await this.repository.connection.findById(scope, created.id),
      );
    });
  }

  async update(
    scope: SmtpConnectionScope,
    connectionId: string,
    input: SmtpConnectionInput,
  ): Promise<SmtpConnectionRecord> {
    const normalized = normalizeInput(input, this.policy, false);
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.connection.lockById(
        scope,
        connectionId,
      );
      if (!current) throw new Error("SMTP_CONNECTION_NOT_FOUND");
      if (current.status === "DISCONNECTED") {
        throw new Error("SMTP_CONNECTION_INVALID_STATE");
      }
      if (
        normalized.configuration.username &&
        ((!normalized.password && !current.passwordEnvelope) ||
          (input.password !== undefined && !normalized.password))
      ) {
        throw new Error("SMTP_CONNECTION_PASSWORD_REQUIRED");
      }
      const updated = await this.repository.connection.update(
        scope,
        connectionId,
        {
          ...normalized.configuration,
          displayName: normalized.displayName,
          provider: input.provider,
        },
      );
      if (!normalized.configuration.username) {
        await this.repository.connection.updatePasswordEnvelope(
          scope,
          connectionId,
          null,
        );
      } else if (input.password !== undefined) {
        await this.repository.connection.updatePasswordEnvelope(
          scope,
          connectionId,
          normalized.password
            ? this.crypto.encrypt(normalized.password, {
                storeId: scope.storeId,
                connectionId,
              })
            : null,
        );
      }
      if (!updated) throw new Error("SMTP_CONNECTION_NOT_FOUND");
      return required(
        await this.repository.connection.findById(scope, connectionId),
      );
    });
  }

  activate(
    scope: SmtpConnectionScope,
    connectionId: string,
  ): Promise<SmtpConnectionRecord> {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.connection.lockById(
        scope,
        connectionId,
      );
      if (!current) throw new Error("SMTP_CONNECTION_NOT_FOUND");
      if (current.status === "DISCONNECTED") {
        throw new Error("SMTP_CONNECTION_INVALID_STATE");
      }
      if (current.status === "ACTIVE") return publicRecord(current);
      return required(
        await this.repository.connection.activate(scope, connectionId),
      );
    });
  }

  disconnect(
    scope: SmtpConnectionScope,
    connectionId: string,
  ): Promise<SmtpConnectionRecord> {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.connection.lockById(
        scope,
        connectionId,
      );
      if (!current) throw new Error("SMTP_CONNECTION_NOT_FOUND");
      if (current.status === "DISCONNECTED") return publicRecord(current);
      return required(
        await this.repository.connection.disconnect(scope, connectionId),
      );
    });
  }

  async disconnectAll(scope: SmtpConnectionScope): Promise<void> {
    await this.repository.runInTransaction(async () => {
      const connections = await this.repository.connection.list(scope);
      for (const connection of connections) {
        if (connection.status !== "DISCONNECTED") {
          await this.repository.connection.disconnect(scope, connection.id);
        }
      }
    });
  }

  resolvePassword(
    scope: SmtpConnectionScope,
    connection: SmtpConnectionSecretRecord,
  ): string | undefined {
    return connection.passwordEnvelope
      ? validateSmtpPassword(
          this.crypto.decrypt(connection.passwordEnvelope, {
            storeId: scope.storeId,
            connectionId: connection.id,
          }),
        )
      : undefined;
  }
}

function normalizeInput(
  input: SmtpConnectionInput,
  policy: SmtpDeploymentPolicy,
  passwordRequiredForUsername: boolean,
) {
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 255) {
    throw new Error("SMTP_CONNECTION_DISPLAY_NAME_INVALID");
  }
  const configuration = parseSmtpConfiguration(
    {
      host: input.host,
      port: input.port,
      security: input.security,
      ...(input.username?.trim()
        ? { username: input.username.trim() }
        : {}),
    },
    policy,
  );
  if (input.provider !== "CUSTOM" && !configuration.username) {
    throw new Error("SMTP_CONNECTION_USERNAME_REQUIRED");
  }
  const suppliedPassword =
    input.password === undefined ||
    input.password === null ||
    input.password.trim().length === 0
      ? undefined
      : validateSmtpPassword(input.password);
  const password = configuration.username ? suppliedPassword : undefined;
  if (passwordRequiredForUsername && configuration.username && !password) {
    throw new Error("SMTP_CONNECTION_PASSWORD_REQUIRED");
  }
  return { displayName, configuration, password };
}

function publicRecord(
  record: SmtpConnectionSecretRecord,
): SmtpConnectionRecord {
  const { passwordEnvelope, ...rest } = record;
  return Object.freeze({
    ...rest,
    hasPassword: passwordEnvelope !== null,
  });
}

function required(
  value: SmtpConnectionRecord | null,
): SmtpConnectionRecord {
  if (!value) throw new Error("SMTP_CONNECTION_NOT_FOUND");
  return value;
}
