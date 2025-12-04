import { Injectable } from '@nestjs/common';

export type ActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams | undefined,
) => Promise<TResult> | TResult;

@Injectable()
export class ActionRegistry {
  private readonly actions = new Map<string, ActionHandler>();

  /**
   * Registers a new action handler and prevents accidental overrides.
   */
  register(action: string, handler: ActionHandler): void {
    if (this.actions.has(action)) {
      throw new Error(`Action "${action}" already registered`);
    }
    this.actions.set(action, handler);
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
    const handler = this.actions.get(action);
    if (!handler) {
      throw new Error(`Action "${action}" not found`);
    }

    return handler as ActionHandler<TParams, TResult>;
  }

  /**
   * Returns all registered actions for observability endpoints.
   */
  list(): string[] {
    return Array.from(this.actions.keys());
  }
}
