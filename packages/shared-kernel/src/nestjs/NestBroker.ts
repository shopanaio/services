import type { ModuleRef } from '@nestjs/core';
import type { ActionHandler, ActionSchema, Context, EventSchema, ServiceSchema } from 'moleculer';
import type { Logger } from '../types';

interface CallOptions {
  meta?: Record<string, unknown>;
}

type EventFunction = (
  this: Record<string, unknown>,
  payload?: unknown,
  meta?: Record<string, unknown>
) => Promise<unknown> | unknown;

interface RegisteredService {
  schema: ServiceSchema;
  instance: Record<string, unknown>;
}

interface NestedContext {
  readonly params: unknown;
  readonly meta: Record<string, unknown>;
  readonly broker: NestBroker;
  readonly service: Record<string, unknown>;
  call: (action: string, params?: unknown, opts?: CallOptions) => Promise<unknown>;
  emit: (event: string, payload?: unknown, opts?: CallOptions) => Promise<void>;
}

/**
 * Fake broker that routes calls through NestJS DI instead of Moleculer.
 * Keeps the same public surface as Moleculer ServiceBroker to keep services untouched.
 */
export class NestBroker {
  private readonly services = new Map<string, RegisteredService>();
  private callCount = 0;
  private callDurations: number[] = [];

  constructor(private moduleRef: ModuleRef | null, public readonly logger: Logger) {}

  /**
   * Register Moleculer service schema and instance for routing.
   */
  registerService(schema: ServiceSchema, instance: Record<string, unknown>): void {
    if (!schema.name) {
      throw new Error('Service schema must declare a name');
    }

    this.services.set(schema.name, { schema, instance });
  }

  /**
   * Call an action by its full name (service.action).
   */
  async call(action: string, params?: unknown, opts?: CallOptions): Promise<unknown> {
    const start = Date.now();

    try {
      const result = await this.callInternal(action, params, opts);
      const duration = Date.now() - start;
      this.callCount += 1;
      this.callDurations.push(duration);
      this.logger.debug(`[${action}] took ${duration}ms`);
      return result;
    } catch (error) {
      this.logger.error(`[${action}] failed:`, error);
      throw error;
    }
  }

  /**
   * Emit an event to every registered service that listens to it.
   */
  async emit(event: string, payload?: unknown, opts?: CallOptions): Promise<void> {
    for (const { schema, instance } of this.services.values()) {
      const handler = schema.events?.[event];
      if (!handler) {
        continue;
      }

      const eventHandler = this.extractEventHandler(handler as EventSchema | EventFunction);
      await eventHandler.call(instance, payload, opts?.meta);
    }
  }

  /**
   * Broadcast mirrors emit when running in a single-process orchestrator.
   */
  async broadcast(event: string, payload?: unknown, opts?: CallOptions): Promise<void> {
    await this.emit(event, payload, opts);
  }

  /**
   * Provide a REPL stub so that existing services do not crash when calling broker.repl().
   */
  repl(): void {
    this.logger.info('REPL not available in NestJS mode');
  }

  /**
   * Stop the broker with detailed logging about who requested the stop and why.
   * This method will always crash the process to ensure visibility.
   *
   * @param reason - Optional reason for stopping the broker
   */
  async stop(reason?: string): Promise<void> {
    const stack = new Error().stack;
    const caller = this.extractCaller(stack);
    const fullStack = this.formatStack(stack);

    const message =
      `${'='.repeat(80)}\n` +
      `🛑 BROKER STOP REQUESTED - SERVICE WILL CRASH 🛑\n` +
      `${'='.repeat(80)}\n` +
      `Caller: ${caller}\n` +
      `Reason: ${reason || 'Not specified'}\n` +
      `Timestamp: ${new Date().toISOString()}\n` +
      `${'='.repeat(80)}\n` +
      `Stack trace:\n${fullStack}\n` +
      `${'='.repeat(80)}`;

    // Log to console directly to bypass NestJS logger formatting
    console.error('\n' + message);

    // Give logger time to flush
    await new Promise(resolve => setTimeout(resolve, 100));

    // Force crash the process
    process.exit(1);
  }

  /**
   * Extract caller information from stack trace.
   */
  private extractCaller(stack?: string): string {
    if (!stack) {
      return 'unknown';
    }

    const lines = stack.split('\n').filter(line => line.trim());
    // Try to find first meaningful caller (skip Error, NestBroker methods)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('NestBroker') && !line.includes('Error')) {
        return this.parseStackLine(line);
      }
    }

    return 'unknown';
  }

  /**
   * Parse a single stack trace line to extract meaningful information.
   */
  private parseStackLine(line: string): string {
    // Format: "    at FunctionName (file:line:col)"
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (match) {
      const [, functionName, filePath, lineNum] = match;
      // Extract just the filename, not full path
      const fileName = filePath.split('/').pop() || filePath;
      return `${functionName} (${fileName}:${lineNum})`;
    }

    // Format: "    at file:line:col" (anonymous function)
    const anonymousMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
    if (anonymousMatch) {
      const [, filePath, lineNum] = anonymousMatch;
      const fileName = filePath.split('/').pop() || filePath;
      return `anonymous (${fileName}:${lineNum})`;
    }

    return line.trim().replace(/^at\s+/, '');
  }

  /**
   * Format full stack trace for better readability.
   */
  private formatStack(stack?: string): string {
    if (!stack) {
      return 'No stack trace available';
    }

    return stack
      .split('\n')
      .slice(1) // Skip "Error" line
      .map(line => `  ${line.trim()}`)
      .join('\n');
  }

  /**
   * Retrieve a service instance by name if it has been registered.
   */
  getService(name: string): Record<string, unknown> | undefined {
    return this.services.get(name)?.instance;
  }

  /**
   * Provide metrics for observability tests.
   */
  getMetrics() {
    const average = this.callDurations.reduce((sum, value) => sum + value, 0);
    const avgDuration = this.callDurations.length === 0 ? 0 : average / this.callDurations.length;

    return {
      totalCalls: this.callCount,
      avgDuration,
      services: this.services.size,
    };
  }

  /**
   * Update ModuleRef after the NestJS application is created.
   */
  setModuleRef(moduleRef: ModuleRef): void {
    this.moduleRef = moduleRef;
  }

  private async callInternal(action: string, params?: unknown, opts?: CallOptions): Promise<unknown> {
    const [serviceName, actionName] = action.split('.');

    if (!serviceName || !actionName) {
      throw new Error(`Action name must be in the format service.action: received ${action}`);
    }

    const registered = this.services.get(serviceName);

    if (!registered) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const actionDef = registered.schema.actions?.[actionName];

    if (!actionDef) {
      throw new Error(`Action ${action} not found`);
    }

    if (typeof actionDef === 'boolean') {
      throw new Error(`Action ${action} has invalid definition`);
    }

    // FIXME: Temporary workaround for serialization compatibility
    //
    // Problem: When migrating from message broker (NATS) to NestJS Orchestrator, we discovered
    // that services were passing class instances (like Money) directly between each other.
    //
    // - With NATS: Data was automatically serialized via JSON.stringify() when sent through
    //   the message broker, which automatically called .toJSON() methods on objects
    //
    // - With NestBroker: Data is passed by reference (in-process calls), so class instances
    //   remain as classes. When these reach validation (zod schemas), they fail because
    //   validators expect plain objects, not class instances with methods.
    //
    // Current solution: Simulate message broker behavior by serializing/deserializing all
    // parameters. This calls .toJSON() on any objects that have it (like Money class).
    //
    // TODO: Proper fix would be to update service interfaces to explicitly serialize
    // domain objects before passing them between services. Services should be responsible
    // for converting their domain models (Money, etc.) to DTOs/plain objects before
    // calling other services. This would make the contract explicit and avoid this
    // performance overhead of JSON serialize/deserialize on every call.
    //
    // Related: Money class in @shopana/shared-money has toJSON() method
    const serializedParams = params ? JSON.parse(JSON.stringify(params, (_key, value) => {
      if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
        return value.toJSON();
      }
      return value;
    })) : params;

    const handler = this.extractActionHandler(actionDef);
    const ctx: NestedContext = {
      params: serializedParams,
      meta: opts?.meta ?? {},
      broker: this,
      service: registered.instance,
      call: (target, targetParams, targetOpts) => this.call(target, targetParams, targetOpts),
      emit: (event, payload, emitOpts) => this.emit(event, payload, emitOpts),
    };

    const context = ctx as unknown as Context<unknown, Record<string, unknown>>;
    return handler.call(registered.instance, context);
  }

  private extractActionHandler(actionDef: ActionSchema | ActionHandler): ActionHandler {
    if (typeof actionDef === 'function') {
      return actionDef;
    }

    if (actionDef.handler && typeof actionDef.handler === 'function') {
      return actionDef.handler;
    }

    throw new Error('Action handler is not callable');
  }

  private extractEventHandler(eventDef?: EventSchema | EventFunction): EventFunction {
    if (!eventDef) {
      throw new Error('Event handler missing');
    }

    if (typeof eventDef === 'function') {
      return eventDef;
    }

    if ('handler' in eventDef && typeof eventDef.handler === 'function') {
      return eventDef.handler as EventFunction;
    }

    throw new Error('Event handler is not callable');
  }
}
