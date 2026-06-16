import { Injectable } from '@nestjs/common';

export type ActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams | undefined,
) => Promise<TResult> | TResult;

export interface ActionMetadata {
  retryPolicy?: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

@Injectable()
export class ActionRegistry {
  private readonly actions = new Map<
    string,
    { handler: ActionHandler; metadata?: ActionMetadata }
  >();

  /**
   * Registers a new action handler and prevents accidental overrides.
   */
  register(action: string, handler: ActionHandler, metadata?: ActionMetadata): void {
    if (this.actions.has(action)) {
      throw new Error(`Action "${action}" already registered`);
    }
    this.actions.set(action, { handler, metadata });
  }

  /**
   * Removes the action owned by a service during shutdown.
   */
  deregister(action: string): void {
    this.actions.delete(action);
  }

  /**
   * Resolves an action handler or throws if it does not exist.
   */
  resolve<TParams = unknown, TResult = unknown>(
    action: string,
  ): ActionHandler<TParams, TResult> {
    const entry = this.actions.get(action);
    if (!entry) {
      throw new Error(`Action "${action}" not found`);
    }

    return entry.handler as ActionHandler<TParams, TResult>;
  }

  /**
   * Returns metadata for a registered action.
   */
  getMetadata(action: string): ActionMetadata | undefined {
    return this.actions.get(action)?.metadata;
  }

  /**
   * Check if action exists.
   */
  has(action: string): boolean {
    return this.actions.has(action);
  }

  /**
   * Returns all registered actions for observability endpoints.
   */
  list(): string[] {
    return Array.from(this.actions.keys());
  }
}
