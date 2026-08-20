import { z } from "zod";

const appCodePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const AppCapabilitySchema = z
  .object({
    key: z.string().min(1),
    assignmentMode: z.enum(["store", "resource"]).optional(),
    /** Discovery cardinality; broadcast callers enumerate routes and invoke each target explicitly. */
    routingMode: z.enum(["single", "broadcast"]).optional(),
    operations: z.record(z.string().min(1)),
  })
  .strict();

const AppLifecycleSchema = z
  .object({
    installWorkflow: z.string().min(1).optional(),
    updateWorkflow: z.string().min(1).optional(),
    suspendAction: z.string().min(1).optional(),
    resumeAction: z.string().min(1).optional(),
    uninstallWorkflow: z.string().min(1).optional(),
    healthAction: z.string().min(1).optional(),
  })
  .strict();

const AppGraphQLManifestSchema = z
  .object({
    admin: z.boolean().default(false),
    storefront: z.boolean().default(false),
  })
  .strict();

const AppIconSchema = z
  .object({
    url: z.string().trim().min(1).max(2_048),
    alt: z.string().trim().min(1).max(255),
  })
  .strict();

const AppManifestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    code: z.string().regex(appCodePattern),
    version: z.string().regex(semverPattern),
    displayName: z.string().trim().min(1),
    description: z.string().trim().min(1),
    lifecycle: AppLifecycleSchema.default({}),
    permissions: z.array(z.string().min(1)).default([]),
    capabilities: z.array(AppCapabilitySchema).default([]),
    graphql: AppGraphQLManifestSchema.default({
      admin: false,
      storefront: false,
    }),
  })
  .strict();

export const AppManifestV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    code: z.string().regex(appCodePattern),
    version: z.string().regex(semverPattern),
    displayName: z.string().trim().min(1),
    description: z.string().trim().min(1),
    icon: AppIconSchema,
    lifecycle: AppLifecycleSchema.default({}),
    permissions: z.array(z.string().min(1)).default([]),
    capabilities: z.array(AppCapabilitySchema).default([]),
    graphql: AppGraphQLManifestSchema.default({
      admin: false,
      storefront: false,
    }),
  })
  .strict();

export const AppManifestSchema = z.discriminatedUnion("schemaVersion", [
  AppManifestV1Schema,
  AppManifestV2Schema,
]);

export type AppManifest = z.infer<typeof AppManifestSchema>;
export type AppManifestV2 = z.infer<typeof AppManifestV2Schema>;

export function defineAppManifest(input: AppManifestV2): AppManifestV2 {
  return Object.freeze(AppManifestV2Schema.parse(input));
}

export interface AppExecutionContext {
  readonly appCode: string;
  readonly installationId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly appVersion: string;
  readonly grantedScopes: readonly string[];
  readonly executionKind?: "STANDARD" | "COMMERCE_FUNCTION";
  readonly operationId?: string;
  readonly actor?: {
    readonly type: "USER" | "APP" | "SERVICE" | "SYSTEM";
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

export type AppInstallationStatus =
  | "PENDING_CONSENT"
  | "INSTALLING"
  | "ACTIVE"
  | "INSTALL_FAILED"
  | "SUSPENDING"
  | "SUSPENDED"
  | "RESUMING"
  | "UPDATING"
  | "UPDATE_FAILED"
  | "UNINSTALLING"
  | "UNINSTALLED"
  | "UNINSTALL_FAILED";

export type AppLifecycleOperationType = "INSTALL" | "UPDATE" | "SUSPEND" | "RESUME" | "UNINSTALL";

export interface AppInstallInput {
  readonly version: string;
  readonly configuration: Readonly<Record<string, unknown>>;
}

export interface AppUpdateInput {
  readonly previousVersion: string;
  readonly targetVersion: string;
  readonly configuration: Readonly<Record<string, unknown>>;
}

export interface AppSuspendInput {
  readonly installationId: string;
}

export interface AppResumeInput {
  readonly installationId: string;
}

export interface AppUninstallInput {
  readonly version: string;
}

export interface AppExecutionContextAccessor {
  current(): Readonly<AppExecutionContext>;
}

export interface AppExecutionContextManager extends AppExecutionContextAccessor {
  run<TResult>(context: Readonly<AppExecutionContext>, callback: () => TResult): TResult;
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
  /**
   * Explicitly allows this action to be called from a Commerce Function.
   * Unmarked actions are treated as potentially mutating.
   */
  readonly readOnly?: boolean;
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

export interface ActiveAppContextResolutionReference {
  readonly appCode: string;
  readonly storeName: string;
  readonly appVersion: string;
}

export interface AppInvocationContextRef {
  readonly installationId: string;
  readonly operationId?: string;
  readonly correlationId?: string;
  readonly executionKind?: "STANDARD" | "COMMERCE_FUNCTION";
}

export interface AppInstallationContextProvider {
  resolve(
    reference: Readonly<AppContextResolutionReference>,
  ): Promise<Readonly<AppExecutionContext>>;
  resolveActive(
    reference: Readonly<ActiveAppContextResolutionReference>,
  ): Promise<Readonly<AppExecutionContext>>;
}

export interface AppSecretResolver {
  resolve(name: string): Promise<string>;
}

export interface AppConfigurationResolver {
  resolve(): Promise<Readonly<Record<string, unknown>>>;
}

export interface AppHostContext {
  readonly broker: AppBroker;
  readonly config: AppDeploymentConfig;
  readonly configuration: AppConfigurationResolver;
  readonly databaseClient: unknown;
  readonly logger: AppLogger;
  readonly installations: AppInstallationContextProvider;
  readonly executionContext: AppExecutionContextManager;
  readonly secrets: AppSecretResolver;
}

export type AppRuntimeStatus = "REGISTERED" | "STARTING" | "READY" | "FAILED" | "STOPPED";

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

export interface AppGraphQLHandlerContext {
  readonly app: Readonly<AppExecutionContext>;
  readonly host: AppHostContext;
  readonly adminContext?: Readonly<{
    readonly user: {
      readonly id: string;
    };
    readonly organizationId: string | null;
    readonly store: {
      readonly id: string;
      readonly organizationId: string;
    } | null;
    readonly permissions: readonly {
      readonly domain: string;
      readonly resource: string;
      readonly action: string;
    }[];
    readonly isSiteAdmin: boolean;
    readonly isOrganizationOwner: boolean;
  }>;
}

export type AppGraphQLFieldHandler<
  TParent = unknown,
  TArgs = Record<string, unknown>,
  TResult = unknown,
> = (parent: TParent, args: TArgs, context: AppGraphQLHandlerContext) => Promise<TResult> | TResult;

export type AppGraphQLHandlerDefinition =
  | {
      readonly kind: "action";
      readonly action: string;
    }
  | {
      readonly kind: "handler";
      readonly handler: AppGraphQLFieldHandler;
    };

export interface AppGraphQLModuleDefinition {
  /**
   * Schema asset path(s) relative to the built App module entry point.
   */
  readonly schema: string | readonly string[];
  /**
   * Resolver mapping using "Type.field" keys.
   */
  readonly handlers: Readonly<Record<string, AppGraphQLHandlerDefinition>>;
}

export interface AppGraphQLDefinition {
  readonly admin?: AppGraphQLModuleDefinition;
  readonly storefront?: AppGraphQLModuleDefinition;
}

export const appGraphQL = Object.freeze({
  action(action: string): AppGraphQLHandlerDefinition {
    const normalized = action.trim();
    if (!normalized || normalized.includes(".")) {
      throw new Error("App GraphQL action must be a non-empty local name");
    }
    return Object.freeze({
      kind: "action" as const,
      action: normalized,
    });
  },

  handler(handler: AppGraphQLFieldHandler): AppGraphQLHandlerDefinition {
    return Object.freeze({
      kind: "handler" as const,
      handler,
    });
  },
});

export interface ShopanaAppDefinition {
  readonly manifest: AppManifest;
  readonly create: (host: AppHostContext) => ShopanaApp;
  readonly graphql?: AppGraphQLDefinition;
}

export function defineApp(definition: ShopanaAppDefinition): ShopanaAppDefinition {
  AppManifestSchema.parse(definition.manifest);
  return Object.freeze(definition);
}
