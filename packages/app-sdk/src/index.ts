import { z } from "zod";

const appCodePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const AppCapabilitySchema = z.object({
  key: z.string().min(1),
  operations: z.record(z.string().min(1)),
});

export const AppManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    code: z.string().regex(appCodePattern),
    version: z.string().regex(semverPattern),
    displayName: z.string().min(1),
    description: z.string().min(1),
    lifecycle: z
      .object({
        installWorkflow: z.string().min(1).optional(),
        updateWorkflow: z.string().min(1).optional(),
        suspendAction: z.string().min(1).optional(),
        resumeAction: z.string().min(1).optional(),
        uninstallWorkflow: z.string().min(1).optional(),
        healthAction: z.string().min(1).optional(),
      })
      .default({}),
    permissions: z.array(z.string().min(1)).default([]),
    capabilities: z.array(AppCapabilitySchema).default([]),
    graphql: z
      .object({
        admin: z.boolean().default(false),
        storefront: z.boolean().default(false),
      })
      .default({ admin: false, storefront: false }),
  })
  .strict();

export type AppManifest = z.infer<typeof AppManifestSchema>;

export function defineAppManifest(input: AppManifest): AppManifest {
  return Object.freeze(AppManifestSchema.parse(input));
}

export interface AppExecutionContext {
  readonly appCode: string;
  readonly installationId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly appVersion: string;
  readonly grantedScopes: readonly string[];
  readonly operationId?: string;
  readonly actor?: {
    readonly type: "USER" | "SERVICE" | "SYSTEM";
    readonly id?: string;
  };
  readonly correlationId?: string;
}

export interface AppDurableContextRef {
  readonly schemaVersion: 1;
  readonly appCode: string;
  readonly installationId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly appVersion: string;
  readonly operationId?: string;
  readonly actor?: AppExecutionContext["actor"];
  readonly correlationId?: string;
}

export interface AppWorkflowInvocation<TInput> {
  readonly context: AppDurableContextRef;
  readonly input: TInput;
}

export interface AppExecutionContextAccessor {
  current(): Readonly<AppExecutionContext>;
}

export interface AppLogger {
  debug(message: string, ...optionalParams: unknown[]): void;
  log(message: string, ...optionalParams: unknown[]): void;
  warn(message: string, ...optionalParams: unknown[]): void;
  error(message: string, ...optionalParams: unknown[]): void;
}

export interface AppWorkflow<TInput = unknown, TResult = unknown> {
  run(input: TInput): Promise<TResult> | TResult;
}

export interface AppSaga<TInput = unknown, TResult = unknown> {
  run(input: TInput): Promise<TResult> | TResult;
}

export interface AppBrokerCallContext {
  readonly caller: {
    readonly kind: "action" | "event";
    readonly service: string;
  };
  readonly app?: Readonly<AppExecutionContext>;
}

export type AppActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams | undefined,
  context: AppBrokerCallContext,
) => Promise<TResult> | TResult;

export interface AppActionMetadata {
  readonly retryPolicy?: {
    readonly maxAttempts: number;
    readonly intervalSeconds: number;
    readonly backoffRate: number;
  };
}

export type AppIdempotencyContext =
  | {
      readonly source: "client";
      readonly clientKey: string;
      readonly organizationId: string;
      readonly apiKeyId: string;
    }
  | {
      readonly source: "workflow";
      readonly organizationId?: string;
      readonly workflowId: string;
      readonly stepId: string;
      readonly callId?: string;
    }
  | {
      readonly source: "content";
      readonly organizationId?: string;
      readonly resourceId: string;
      readonly operation: string;
      readonly content?: unknown;
      readonly contentHash?: string;
    };

export interface AppWorkflowStartOptions {
  readonly workflowId?: string;
  readonly queueName?: string;
  readonly enqueueOptions?: {
    readonly queuePartitionKey?: string;
    readonly deduplicationID?: string;
    readonly priority?: number;
    readonly delaySeconds?: number;
  };
  readonly duplicationPolicy?: "reject" | "return-existing";
  readonly timeoutMS?: number;
}

export interface AppBroker {
  register<TParams = unknown, TResult = unknown>(
    action: string,
    handler: AppActionHandler<TParams, TResult>,
    metadata?: AppActionMetadata,
  ): void;
  registerWorkflow(name: string, workflow: AppWorkflow): void;
  registerSaga(name: string, saga: AppSaga): void;
  call<TResult = unknown, TParams = unknown>(
    qualifiedAction: string,
    input?: TParams,
  ): Promise<TResult>;
  runWorkflow<TResult = unknown, TInput = unknown>(
    qualifiedWorkflow: string,
    input: TInput,
    idempotency: AppIdempotencyContext,
    options?: AppWorkflowStartOptions,
  ): Promise<TResult>;
}

export interface AppDeploymentConfig {
  readonly enabled: boolean;
  readonly required: boolean;
  readonly [key: string]: unknown;
}

export interface AppContextResolutionReference {
  readonly appCode: string;
  readonly installationId: string;
  readonly appVersion: string;
  readonly operationId?: string;
}

export interface AppInvocationContextRef {
  readonly installationId: string;
  readonly operationId?: string;
  readonly correlationId?: string;
}

export interface AppInstallationContextProvider {
  resolve(
    reference: Readonly<AppContextResolutionReference>,
  ): Promise<Readonly<AppExecutionContext>>;
}

export interface AppSecretResolver {
  resolve(name: string): Promise<string>;
}

export interface AppHostContext {
  readonly broker: AppBroker;
  readonly config: AppDeploymentConfig;
  readonly databaseClient: unknown;
  readonly logger: AppLogger;
  readonly installations: AppInstallationContextProvider;
  readonly executionContext: AppExecutionContextAccessor;
  readonly secrets: AppSecretResolver;
}

export type AppRuntimeStatus =
  | "REGISTERED"
  | "STARTING"
  | "READY"
  | "FAILED"
  | "STOPPED";

export interface AppRuntimeHealth {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly message?: string;
}

export interface ShopanaApp {
  register(): Promise<void> | void;
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
  health(): Promise<AppRuntimeHealth>;
}

export interface AppGraphQLDefinition {
  readonly admin?: boolean;
  readonly storefront?: boolean;
}

export interface ShopanaAppDefinition {
  readonly manifest: AppManifest;
  readonly create: (host: AppHostContext) => ShopanaApp;
  readonly graphql?: AppGraphQLDefinition;
}

export function defineApp(
  definition: ShopanaAppDefinition,
): ShopanaAppDefinition {
  AppManifestSchema.parse(definition.manifest);
  return Object.freeze(definition);
}
