@shopana/woodpecker-ci-config-service
===============================

Framework for implementing Woodpecker CI configuration services with workflow script management.

The package provides building blocks to implement a Woodpecker config extension service that generates pipelines at request time, including a ready-to-use Express router, type definitions for Woodpecker payload and workflow YAML, filesystem-based workflow discovery, and optional HTTP message signature verification.


Features
--------

- Type definitions for Woodpecker extension requests and workflow YAML
- Filesystem-based discovery of workflow scripts (default directory: `workflows/`)
- Express router for POST `/` with JSON parsing and error handling
- Ed25519 HTTP message signature verification middleware
- Composable components without opinionated logging or frameworks


Requirements
------------

- Node.js >= 18


Installation
------------

Install the library and only the peer dependencies that are actually used:

```bash
# Programmatic usage (no HTTP server)
yarn add @shopana/woodpecker-ci-config-service

# With Express router / middleware
yarn add @shopana/woodpecker-ci-config-service express
```


Quickstart
----------

1) Create a workflow script

Workflow scripts are discovered at runtime from the `workflows/` directory (relative to `process.cwd()`). Files ending with `.workflow.js` are loaded. A module MUST default-export a class with a zero-argument constructor; the loader will instantiate it. Named exports and pre-built instances are ignored.

When authoring in TypeScript, ensure that `.workflow.ts` sources are compiled to `.workflow.js` for runtime discovery (e.g., via your build step).

Example (TypeScript source): `workflows/hello.workflow.ts`

```ts
import type {
  WorkflowScript,
  ScriptContext,
  GeneratedConfig,
  WorkflowYaml,
} from "@shopana/woodpecker-ci-config-service";

/**
 * Simple example workflow that always generates a single pipeline with one step.
 */
export default class HelloWorkflow implements WorkflowScript {
  /** Returns workflow identifier used for logging/debugging. */
  getName(): string {
    return "hello";
  }

  /**
   * Decide whether this workflow should handle the current request.
   * You can inspect repo, pipeline, netrc fields from the context.
   */
  supports(_ctx: ScriptContext): boolean {
    return true; // enable for all events; add your own conditions
  }

  /** Build and return one or more generated pipelines. */
  async build(_ctx: ScriptContext): Promise<GeneratedConfig[]> {
    const workflow: WorkflowYaml = {
      steps: [
        {
          name: "greet",
          image: "alpine:3.19",
          commands: ["echo hello from Woodpecker"]
        },
      ],
    };

    return [
      {
        name: "ci",
        workflow,
      },
    ];
  }
}
```

2) Wire up an Express server

Use the provided router to handle POST `/` and delegate to `ConfigService`. Signature verification is optional.

```ts
import express from "express";
import {
  ConfigService,
  WorkflowScriptLoader,
  createExpressRouter,
  createSignatureMiddleware,
} from "@shopana/woodpecker-ci-config-service";

const app = express();

const publicKey = process.env.WOODPECKER_EXT_PUBLIC_KEY;
if (publicKey) {
  app.use(createSignatureMiddleware({ publicKey }));
}

// Create the service and router
const loader = new WorkflowScriptLoader(); // defaults to ./workflows
const service = new ConfigService({ loader });
app.use("/", createExpressRouter(service));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Woodpecker config service listening on :${port}`);
});
```

3) Configure Woodpecker

Point your repository (or instance) at the config extension endpoint (the URL where this service listens). Woodpecker will POST a JSON payload and expects a response in the following form:

```json
{
  "configs": [
    { "name": "ci", "data": "yaml-string-here" }
  ]
}
```

The library handles converting typed `WorkflowYaml` objects to YAML strings for you.


Advanced usage
--------------

- Custom workflows directory

```ts
import { WorkflowScriptLoader } from "@shopana/woodpecker-ci-config-service";
const loader = new WorkflowScriptLoader("./ci/workflows"); // absolute or relative path
```

- Programmatic generation (no HTTP)

```ts
import { ConfigService } from "@shopana/woodpecker-ci-config-service";

const service = new ConfigService({});
const files = await service.generate({ repo, pipeline, netrc });
// files: Array<{ name: string; data: string /* YAML */ }>
```


API Overview
------------

- `class ConfigService`
  - `constructor({ loader?: WorkflowLoader })`
  - `generate(body: ConfigExtensionRequest): Promise<ConfigFile[]>`

- `class WorkflowScriptLoader implements WorkflowLoader`
  - Discovers and loads scripts from filesystem; loads only default-export classes from `*.workflow.js` and instantiates them.

- `createExpressRouter(service: ConfigService): Router`
  - Express router that wires JSON parsing and handles POST `/`.

- `createSignatureMiddleware({ publicKey: string }): RequestHandler`
  - Verifies HTTP message signatures (Ed25519). Expects `Signature` and `Signature-Input` headers.

- Types
  - `ConfigExtensionRequest`, `ConfigExtensionResponse`, `ConfigFile`, `Repo`, `Pipeline`, `Netrc`
  - `WorkflowYaml` – strongly-typed representation of Woodpecker YAML
  - `WorkflowScript`, `ScriptContext`, `GeneratedConfig`, `WorkflowLoader`


Security notes
--------------

- Signature verification is optional but strongly recommended for internet-exposed services.
- The signature middleware assumes a hex-encoded Ed25519 public key and validates against the request target, selected headers, and `created` parameter.
- Ensure you keep raw request body available for verification (the provided router sets `req.rawBody` via Express JSON `verify` hook).


Troubleshooting
---------------

- No workflows returned
  - Ensure you have a `*.workflow.js` file whose module default-exports a class implementing `WorkflowScript` with a zero-argument constructor, and that `supports(ctx)` returns `true`.
  - When using TypeScript, verify the `.workflow.ts` is compiled to `.workflow.js` in the final build output.
  - The service throws `Error("No workflows produced by scripts")` when nothing matches.

- Peer dependency warnings
  - Install `express` only if you use the provided Express router/middleware.


License
-------

Apache-2.0 © Shopana.io
