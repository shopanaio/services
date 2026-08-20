import type { AppHostContext, AppExecutionContext } from "@shopana/app-sdk";
import type {
  ContextStore,
  ResolvedStorefrontAccessContext,
  StorefrontPermission,
} from "@shopana/shared-context";
import type {
  HeadlessStorefrontRepository,
  HeadlessStorefrontScope,
} from "../repositories/index.js";
import { StorefrontCredentialCrypto } from "../control-plane/index.js";

export interface StorefrontAccessResolveInput {
  readonly token: string;
  readonly accessMode: "PUBLIC" | "PRIVATE";
  readonly buyerIp?: string;
  readonly requestId: string;
}

export class StorefrontCredentialResolver {
  private readonly usedCredentialIds = new Set<string>();
  private usageTimer: NodeJS.Timeout | null = null;
  constructor(
    private readonly repository: HeadlessStorefrontRepository,
    private readonly crypto: StorefrontCredentialCrypto,
    private readonly host: AppHostContext,
    private readonly appVersion: string,
  ) {}

  start(): void {
    if (this.usageTimer) return;
    this.usageTimer = setInterval(() => void this.flushUsage(), 60_000);
    this.usageTimer.unref();
  }

  async stop(): Promise<void> {
    if (this.usageTimer) clearInterval(this.usageTimer);
    this.usageTimer = null;
    await this.flushUsage();
  }

  async resolve(
    input: StorefrontAccessResolveInput,
  ): Promise<ResolvedStorefrontAccessContext | null> {
    let parsed: ReturnType<StorefrontCredentialCrypto["parse"]>;
    try {
      parsed = this.crypto.parse(input.token);
    } catch {
      return null;
    }
    if (parsed.kind !== input.accessMode) return null;
    const credential = await this.repository.credential.findByKid(parsed.kid);
    if (
      !credential ||
      credential.kind !== input.accessMode ||
      credential.status !== "ACTIVE" ||
      credential.tokenVersion !== parsed.tokenVersion ||
      credential.connectionStatus !== "ACTIVE" ||
      !this.crypto.verify(input.token, credential.pepperVersion, credential.tokenDigest)
    ) {
      return null;
    }

    let installation: Readonly<AppExecutionContext>;
    try {
      installation = await this.host.installations.resolve({
        appCode: "shopana-headless",
        installationId: credential.installationId,
        appVersion: this.appVersion,
      });
    } catch {
      return null;
    }
    if (
      installation.storeId !== credential.storeId ||
      installation.organizationId !== credential.organizationId
    ) {
      return null;
    }
    const storeResult = await this.host.executionContext.run(installation, () =>
      this.host.broker.call<
        {
          readonly store: ContextStore | null;
          readonly userErrors: readonly {
            readonly code: string;
            readonly message: string;
          }[];
        },
        { readonly id: string }
      >("project.getStoreById", { id: credential.storeId }),
    );
    const store = storeResult?.store;
    if (
      !store ||
      store.id !== credential.storeId ||
      store.organizationId !== credential.organizationId
    ) {
      return null;
    }
    const scope: HeadlessStorefrontScope = {
      installationId: credential.installationId,
      organizationId: credential.organizationId,
      storeId: credential.storeId,
    };
    const policy = await this.repository.accessPolicy.findByConnectionId(
      scope,
      credential.connectionId,
    );
    if (!policy) return null;
    this.usedCredentialIds.add(credential.id);
    return Object.freeze({
      store: Object.freeze({ ...store }),
      access: Object.freeze({
        connectionId: credential.connectionId,
        installationId: credential.installationId,
        credentialId: credential.id,
        mode: input.accessMode,
        permissions: Object.freeze([...policy.permissions] as StorefrontPermission[]),
        policyRevision: policy.revision,
      }),
    });
  }

  private async flushUsage(): Promise<void> {
    const ids = [...this.usedCredentialIds];
    if (ids.length === 0) return;
    ids.forEach((id) => this.usedCredentialIds.delete(id));
    try {
      await this.repository.credential.markAuthenticatedCredentialsUsed(
        ids,
        new Date().toISOString(),
      );
    } catch {
      ids.forEach((id) => this.usedCredentialIds.add(id));
    }
  }
}
