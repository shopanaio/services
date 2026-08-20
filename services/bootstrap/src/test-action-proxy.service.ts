import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  ActionRegistry,
  InjectBroker,
  ServiceBroker,
  type ActionHandler,
  type ActionMetadata,
} from "@shopana/shared-kernel";
import { getConfig } from "@shopana/shared-service-config";

type CallActionRequest = {
  action?: unknown;
  params?: unknown;
};

type RunWorkflowRequest = {
  workflow?: unknown;
  params?: unknown;
  idempotencyKey?: unknown;
  workflowId?: unknown;
};

type ScopedActionOverrideRequest = {
  action?: unknown;
  storeId?: unknown;
  mode?: unknown;
  result?: unknown;
};

type ScopedActionOverrideMode = "PASS" | "THROW" | "RETURN" | "THROW_AFTER";

type ScopedActionOverride = {
  mode: ScopedActionOverrideMode;
  result?: unknown;
  calls: number;
};

type ScopedAction = {
  original: ActionHandler;
  metadata?: ActionMetadata;
  overrides: Map<string, ScopedActionOverride>;
};

const DEFAULT_HOST = "127.0.0.1";
const MAX_BODY_BYTES = 1024 * 1024;

@Injectable()
export class TestActionProxyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TestActionProxyService.name);
  private server: Server | null = null;
  private readonly scopedActions = new Map<string, ScopedAction>();

  constructor(
    @InjectBroker("test") private readonly broker: ServiceBroker,
    @Inject(ActionRegistry) private readonly actionRegistry: ActionRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const port = this.resolvePort();
    if (!port) return;

    this.server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(port, DEFAULT_HOST, () => {
        this.server?.off("error", reject);
        resolve();
      });
    });

    this.logger.log(
      `Test action proxy listening on http://${DEFAULT_HOST}:${port}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    for (const [action, scoped] of this.scopedActions) {
      this.actionRegistry.deregister(action);
      this.actionRegistry.register(action, scoped.original, scoped.metadata);
    }
    this.scopedActions.clear();
    if (!this.server) return;

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    this.server = null;
  }

  private resolvePort(): number | null {
    const envPort = parsePort(process.env.TEST_ACTION_PROXY_PORT);
    if (envPort) return envPort;

    const config = getConfig();
    return config.services.test?.ports?.action_proxy ?? null;
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    try {
      if (request.method === "GET" && request.url === "/__test/health") {
        this.sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === "GET" && request.url === "/__test/actions") {
        this.sendJson(response, 200, {
          ok: true,
          actions: this.actionRegistry.list().sort(),
        });
        return;
      }

      if (request.method === "POST" && request.url === "/__test/actions/call") {
        const body = await readJsonBody<CallActionRequest>(request);
        const action = body.action;

        if (typeof action !== "string" || action.trim() === "") {
          this.sendJson(response, 400, {
            ok: false,
            error: {
              code: "INVALID_ACTION",
              message:
                'Request body must include non-empty string field "action"',
            },
          });
          return;
        }

        const result = await this.broker.call(action, body.params);
        this.sendJson(response, 200, { ok: true, result });
        return;
      }

      if (request.method === "POST" && request.url === "/__test/workflows/run") {
        const body = await readJsonBody<RunWorkflowRequest>(request);
        const { workflow, idempotencyKey, workflowId } = requireRunWorkflowRequest(body);
        const result = await this.broker.runWorkflow(
          workflow,
          body.params,
          {
            source: "content",
            resourceId: "e2e-test-action-proxy",
            operation: idempotencyKey,
            content: { workflow, idempotencyKey, params: body.params },
          },
          workflowId ? { workflowId } : undefined,
        );
        this.sendJson(response, 200, { ok: true, result });
        return;
      }

      if (
        request.method === "POST" &&
        request.url === "/__test/actions/fault"
      ) {
        const body = await readJsonBody<ScopedActionOverrideRequest>(request);
        const override = requireScopedActionOverrideRequest(body);
        this.enableScopedAction(
          override.action,
          override.storeId,
          override.mode,
          override.result,
        );
        this.sendJson(response, 200, { ok: true });
        return;
      }

      if (
        request.method === "POST" &&
        request.url === "/__test/actions/stats"
      ) {
        const body = await readJsonBody<ScopedActionOverrideRequest>(request);
        const { action, storeId } = requireScopedActionIdentity(body);
        this.sendJson(response, 200, {
          ok: true,
          calls: this.scopedActions.get(action)?.overrides.get(storeId)?.calls ?? 0,
        });
        return;
      }

      if (
        request.method === "POST" &&
        request.url === "/__test/actions/restore"
      ) {
        const body = await readJsonBody<ScopedActionOverrideRequest>(request);
        const { action, storeId } = requireScopedActionIdentity(body);
        this.restoreScopedAction(action, storeId);
        this.sendJson(response, 200, { ok: true });
        return;
      }

      this.sendJson(response, 404, {
        ok: false,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
    } catch (error) {
      this.sendJson(response, 500, {
        ok: false,
        error: serializeError(error),
      });
    }
  }

  private enableScopedAction(
    action: string,
    storeId: string,
    mode: ScopedActionOverrideMode,
    result?: unknown,
  ): void {
    let scoped = this.scopedActions.get(action);
    if (!scoped) {
      scoped = {
        original: this.actionRegistry.resolve(action),
        metadata: this.actionRegistry.getMetadata(action),
        overrides: new Map(),
      };
      this.actionRegistry.deregister(action);
      this.actionRegistry.register(
        action,
        async (params, context) => {
          const override = findScopedOverride(params, scoped!.overrides);
          if (!override) return scoped!.original(params, context);
          override.calls += 1;
          if (override.mode === "THROW") {
            throw new Error(`Scoped e2e fault for ${action}`);
          }
          if (override.mode === "RETURN") return override.result;
          const output = await scoped!.original(params, context);
          if (override.mode === "THROW_AFTER") {
            throw new Error(`Scoped e2e post-commit fault for ${action}`);
          }
          return output;
        },
        scoped.metadata,
      );
      this.scopedActions.set(action, scoped);
    }
    scoped.overrides.set(storeId, { mode, result, calls: 0 });
  }

  private restoreScopedAction(action: string, storeId: string): void {
    const scoped = this.scopedActions.get(action);
    if (!scoped) return;
    scoped.overrides.delete(storeId);
    if (scoped.overrides.size > 0) return;

    this.actionRegistry.deregister(action);
    this.actionRegistry.register(action, scoped.original, scoped.metadata);
    this.scopedActions.delete(action);
  }

  private sendJson(
    response: ServerResponse,
    statusCode: number,
    payload: unknown,
  ): void {
    response.statusCode = statusCode;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify(payload));
  }
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes`);
    }
    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody.trim()) return {} as T;

  return JSON.parse(rawBody) as T;
}

function requireScopedActionIdentity(body: ScopedActionOverrideRequest): {
  action: string;
  storeId: string;
} {
  if (typeof body.action !== "string" || body.action.trim() === "") {
    throw new Error(
      'Fault request must include non-empty string field "action"',
    );
  }
  if (typeof body.storeId !== "string" || body.storeId.trim() === "") {
    throw new Error(
      'Fault request must include non-empty string field "storeId"',
    );
  }
  return { action: body.action, storeId: body.storeId };
}

function requireScopedActionOverrideRequest(body: ScopedActionOverrideRequest): {
  action: string;
  storeId: string;
  mode: ScopedActionOverrideMode;
  result?: unknown;
} {
  const identity = requireScopedActionIdentity(body);
  const mode = body.mode ?? "THROW";
  if (!isScopedActionOverrideMode(mode)) {
    throw new Error(
      'Fault request "mode" must be PASS, THROW, RETURN, or THROW_AFTER',
    );
  }
  if (mode === "RETURN" && !("result" in body)) {
    throw new Error('Fault request with mode RETURN must include "result"');
  }
  return { ...identity, mode, result: body.result };
}

function requireRunWorkflowRequest(body: RunWorkflowRequest): {
  workflow: string;
  idempotencyKey: string;
  workflowId?: string;
} {
  if (typeof body.workflow !== "string" || body.workflow.trim() === "") {
    throw new Error('Workflow request must include non-empty string field "workflow"');
  }
  if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim() === "") {
    throw new Error(
      'Workflow request must include non-empty string field "idempotencyKey"',
    );
  }
  if (
    body.workflowId !== undefined &&
    (typeof body.workflowId !== "string" || body.workflowId.trim() === "")
  ) {
    throw new Error('Workflow request field "workflowId" must be a non-empty string');
  }
  return {
    workflow: body.workflow,
    idempotencyKey: body.idempotencyKey,
    ...(typeof body.workflowId === "string" ? { workflowId: body.workflowId } : {}),
  };
}

function isScopedActionOverrideMode(value: unknown): value is ScopedActionOverrideMode {
  return (
    value === "PASS" ||
    value === "THROW" ||
    value === "RETURN" ||
    value === "THROW_AFTER"
  );
}

function findScopedOverride(
  params: unknown,
  overrides: ReadonlyMap<string, ScopedActionOverride>,
): ScopedActionOverride | undefined {
  const storeId = scopedStoreId(params);
  return storeId ? overrides.get(storeId) : undefined;
}

function scopedStoreId(params: unknown): string | null {
  if (!params || typeof params !== "object") return null;
  if ("storeId" in params && typeof params.storeId === "string") {
    return params.storeId;
  }
  for (const key of ["context", "params", "input"] as const) {
    if (key in params) {
      const nested = scopedStoreId(params[key]);
      if (nested) return nested;
    }
  }
  return null;
}

function parsePort(value: string | undefined): number | null {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function serializeError(error: unknown): {
  code: string;
  message: string;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      code: "ACTION_PROXY_ERROR",
      name: error.name,
      message: error.message,
    };
  }

  return {
    code: "ACTION_PROXY_ERROR",
    message: String(error),
  };
}
