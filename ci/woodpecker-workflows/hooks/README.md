# Woodpecker CI Hooks

This directory contains hooks that are executed during the Woodpecker CI configuration generation lifecycle.

## Hook Lifecycle

Hooks follow a pattern similar to test frameworks (beforeAll/afterAll):

1. **BeforeAll** - Executed once before any workflow generation starts
2. **For each workflow script:**
   - **BeforeEach** - Executed before the workflow script
   - [Workflow is generated]
   - **AfterEach** - Executed after the workflow script
3. **AfterAll** - Executed once after all workflows (always runs, even on errors)

## Hook Context

Hooks receive a `HookContext` object that contains:

- `scriptContext` - Original Woodpecker script context (repo, pipeline, netrc)
- `env` - Environment variables that hooks can set and read
- `metadata` - Custom metadata that hooks can store for later hooks
  - `currentWorkflow` - Name of the current workflow being processed (in BeforeEach/AfterEach)
  - `workflowCount` - Number of workflows processed
  - `startTime` - Generation start timestamp
- `errors` - Array of errors encountered during hook execution
- `generatedConfigs` - Generated workflow configs (available in AfterEach/AfterAll)

**Important:** Hooks can modify the context, and changes are visible to subsequent hooks.

## Creating a Hook

Create a file matching the pattern `*.hook.ts` (dev) or `*.hook.js` (production) in this directory or subdirectories.

### Hook Interface

```typescript
import type {
  Hook,
  HookContext,
  HookStage,
} from "@shopana/woodpecker-ci-config-service";

export default class MyHook implements Hook {
  getName(): string {
    return "my-hook";
  }

  getStage(): HookStage {
    return "before-all" as HookStage;
  }

  supports(context: HookContext): boolean {
    // Return true if this hook should run for this context
    return true;
  }

  async execute(context: HookContext): Promise<void> {
    // Your hook logic here
    // You can modify context.env, context.metadata, etc.
  }
}
```

## Hook Stages

### BeforeAll
**When:** Once before any workflow generation starts
**Use for:**
- Loading global configurations
- Initializing connections to external APIs
- Setting up global environment variables
- Fetching shared data (changed files, feature flags)
- Initial validation

**Example:**
```typescript
async execute(context: HookContext): Promise<void> {
  context.env.REPO_NAME = context.scriptContext.repo.name;
  context.metadata.startTime = Date.now();
  console.log('Starting workflow generation...');
}
```

### BeforeEach
**When:** Before each workflow script execution
**Use for:**
- Preparing context for specific workflow
- Workflow-specific validation
- Setting up workflow parameters
- Logging workflow start

**Example:**
```typescript
async execute(context: HookContext): Promise<void> {
  const workflowName = context.metadata.currentWorkflow;
  console.log(`Generating workflow: ${workflowName}`);
  context.metadata.workflowStartTime = Date.now();
}
```

### AfterEach
**When:** After each workflow script execution
**Use for:**
- Modifying generated workflow configs
- Adding common steps or variables
- Validating workflow output
- Logging workflow completion

**Example:**
```typescript
async execute(context: HookContext): Promise<void> {
  const { generatedConfigs } = context;
  for (const config of generatedConfigs || []) {
    if (!config.workflow.variables) {
      config.workflow.variables = {};
    }
    config.workflow.variables.CUSTOM_VAR = "value";
  }
}
```

### AfterAll
**When:** Once after all workflows are generated (always runs, even on errors)
**Use for:**
- Cleanup resources
- Closing connections
- Final validation
- Sending metrics/notifications
- Logging summary

**Example:**
```typescript
async execute(context: HookContext): Promise<void> {
  const duration = Date.now() - (context.metadata.startTime as number);
  console.log(`Generation completed in ${duration}ms`);
  console.log(`Generated ${context.generatedConfigs?.length} configs`);

  if (context.errors.length > 0) {
    console.error('Errors occurred:', context.errors);
  }
}
```

## Examples

See the example hooks in this directory:
- `before-all.hook.ts` - Global setup and environment variables
- `before-each.hook.ts` - Workflow-specific preparation
- `after-each.hook.ts` - Workflow modification and enrichment
- `after-all.hook.ts` - Cleanup and summary logging

## Best Practices

1. **Naming**: Use descriptive names for your hooks that indicate their purpose
2. **Stage Selection**: Choose the appropriate stage for your hook:
   - BeforeAll: Global setup
   - BeforeEach: Per-workflow preparation
   - AfterEach: Per-workflow modification
   - AfterAll: Cleanup and finalization
3. **Supports Method**: Use `supports()` to conditionally run hooks based on context
4. **Error Handling**: Handle errors gracefully; AfterAll always runs
5. **Context Modification**: Be careful when modifying shared context
6. **Metadata**: Use `context.metadata` to pass data between hooks
7. **Environment**: Use `context.env` for environment variables
8. **Logging**: Log important operations for debugging

## Execution Order Example

```
1. BeforeAll hooks execute
   └─ Setup global environment variables
   └─ Initialize metadata

2. For each workflow script that supports the context:
   ├─ BeforeEach hooks execute
   │  └─ Set currentWorkflow in metadata
   │  └─ Prepare workflow-specific context
   │
   ├─ Workflow script builds configs
   │
   └─ AfterEach hooks execute
      └─ Modify generated configs
      └─ Add common variables

3. AfterAll hooks execute (always, even on errors)
   └─ Log summary
   └─ Send metrics
   └─ Cleanup resources
```

## Loading Hooks

Hooks are automatically loaded from this directory when the ConfigService is initialized. No manual registration is required.

## Debugging

Check the console output for hook execution logs. Each hook logs when it runs, and any errors are captured in `context.errors`.

To see hook execution:
```bash
yarn dev
# Watch the console for [BeforeAll], [BeforeEach], [AfterEach], [AfterAll] logs
```
