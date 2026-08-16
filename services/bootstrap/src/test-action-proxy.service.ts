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

type ScopedFaultRequest = {
  action?: unknown;
  storeId?: unknown;
};

type ScopedFault = {
  original: ActionHandler;
  metadata?: ActionMetadata;
  storeIds: Set<string>;
};

const DEFAULT_HOST = "127.0.0.1";
const MAX_BODY_BYTES = 1024 * 1024;

@Injectable()
export class TestActionProxyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TestActionProxyService.name);
  private server: Server | null = null;
  private readonly scopedFaults = new Map<string, ScopedFault>();

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
    for (const [action, fault] of this.scopedFaults) {
      this.actionRegistry.deregister(action);
      this.actionRegistry.register(action, fault.original, fault.metadata);
    }
    this.scopedFaults.clear();
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

      if (
        request.method === "POST" &&
        request.url === "/__test/actions/fault"
      ) {
        const body = await readJsonBody<ScopedFaultRequest>(request);
        const { action, storeId } = requireScopedFaultRequest(body);
        this.enableScopedFault(action, storeId);
        this.sendJson(response, 200, { ok: true });
        return;
      }

      if (
        request.method === "POST" &&
        request.url === "/__test/actions/restore"
      ) {
        const body = await readJsonBody<ScopedFaultRequest>(request);
        const { action, storeId } = requireScopedFaultRequest(body);
        this.restoreScopedFault(action, storeId);
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

  private enableScopedFault(action: string, storeId: string): void {
    const active = this.scopedFaults.get(action);
    if (active) {
      active.storeIds.add(storeId);
      return;
    }

    const fault: ScopedFault = {
      original: this.actionRegistry.resolve(action),
      metadata: this.actionRegistry.getMetadata(action),
      storeIds: new Set([storeId]),
    };
    this.actionRegistry.deregister(action);
    this.actionRegistry.register(
      action,
      (params, context) => {
        if (hasStoreId(params, fault.storeIds)) {
          throw new Error(`Scoped e2e fault for ${action}`);
        }
        return fault.original(params, context);
      },
      fault.metadata,
    );
    this.scopedFaults.set(action, fault);
  }

  private restoreScopedFault(action: string, storeId: string): void {
    const fault = this.scopedFaults.get(action);
    if (!fault) return;
    fault.storeIds.delete(storeId);
    if (fault.storeIds.size > 0) return;

    this.actionRegistry.deregister(action);
    this.actionRegistry.register(action, fault.original, fault.metadata);
    this.scopedFaults.delete(action);
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

function requireScopedFaultRequest(body: ScopedFaultRequest): {
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

function hasStoreId(params: unknown, storeIds: ReadonlySet<string>): boolean {
  if (!params || typeof params !== "object" || !("storeId" in params))
    return false;
  return storeIds.has(String(params.storeId));
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
