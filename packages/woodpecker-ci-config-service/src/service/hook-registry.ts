import { Hook, HookContext, HookStage } from "./interface";

/**
 * Registry for managing and executing hooks in the correct order.
 * Groups hooks by stage and executes them in the order they were registered.
 */
export class HookRegistry {
  private readonly hooks: Map<HookStage, Hook[]> = new Map();

  /**
   * Registers a hook in the registry.
   * Hooks are grouped by stage and will be executed in registration order.
   *
   * @param hook - Hook to register
   */
  register(hook: Hook): void {
    const stage = hook.getStage();
    const stageHooks = this.hooks.get(stage) || [];
    stageHooks.push(hook);
    this.hooks.set(stage, stageHooks);
  }

  /**
   * Executes all hooks for a specific stage.
   * Only executes hooks that support the given context.
   *
   * @param stage - Hook stage to execute
   * @param context - Hook context that will be passed to hooks
   * @returns Promise that resolves when all hooks for the stage complete
   */
  async executeStage(stage: HookStage, context: HookContext): Promise<void> {
    const stageHooks = this.hooks.get(stage) || [];

    for (const hook of stageHooks) {
      try {
        const shouldRun = await hook.supports(context);
        if (shouldRun) {
          await hook.execute(context);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(
          `Error executing hook ${hook.getName()} at stage ${stage}:`,
          err
        );
        context.errors.push({
          stage,
          hookName: hook.getName(),
          error: err,
        });

        // AfterAll hooks should always run, even on errors
        if (stage !== HookStage.AfterAll) {
          throw err;
        }
      }
    }
  }

  /**
   * Executes all registered hooks in the correct lifecycle order.
   * AfterAll hooks are always executed, even if previous stages fail.
   *
   * @param context - Hook context that will be passed to hooks
   * @returns Promise that resolves when all hooks complete
   */
  async executeAll(context: HookContext): Promise<void> {
    try {
      await this.executeStage(HookStage.BeforeAll, context);
      // BeforeEach and AfterEach are called per workflow in ConfigService
    } finally {
      // Always execute AfterAll hooks, even on error
      try {
        await this.executeStage(HookStage.AfterAll, context);
      } catch (afterAllError) {
        console.error("Error in AfterAll hooks:", afterAllError);
      }
    }
  }

  /**
   * Returns all hooks registered for a specific stage.
   *
   * @param stage - Hook stage
   * @returns Array of hooks for the stage
   */
  getHooksForStage(stage: HookStage): Hook[] {
    return [...(this.hooks.get(stage) || [])];
  }

  /**
   * Returns the total number of registered hooks across all stages.
   *
   * @returns Total number of registered hooks
   */
  getHookCount(): number {
    let count = 0;
    for (const stageHooks of this.hooks.values()) {
      count += stageHooks.length;
    }
    return count;
  }

  /**
   * Clears all registered hooks.
   */
  clear(): void {
    this.hooks.clear();
  }
}
