# NestJS Orchestrator

## Overview

NestJS Orchestrator replaces Moleculer with NestJS DI for service orchestration while keeping every service implementation unchanged. The adapter exposes a fake `broker` so services continue to read from `ctx` and call `broker.call(...)` exactly as before, but the transport layer is replaced with direct method calls.

## Key Benefits

- **Zero latency**: Direct method invocation without serialization or messaging layers.
- **IDE-friendly debugging**: Standard call stack and stack traces instead of asynchronous events.
- **Shared tooling**: Leverages NestJS ecosystem for configuration, DI, and lifecycle hooks.
- **Backward compatible**: Services can still be started via Moleculer when needed.

## Architecture

```text
┌─────────────────────────────────────────┐
│         NestJS Orchestrator             │
├─────────────────────────────────────────┤
│  NestBroker (fake Moleculer broker)     │
│  ├─ Inventory Service Adapter           │
│  ├─ Pricing Service Adapter             │
│  ├─ Checkout Service Adapter            │
│  └─ ... other services                  │
└─────────────────────────────────────────┘
```

Service adapters wrap existing `service.ts` files:

- `created` → constructor
- `started` → `onModuleInit`
- `stopped` → `onModuleDestroy`
- `broker.call` delegates to `NestBroker.call`
- `broker.emit`/`broadcast` remain supported

## Usage

### Development

```bash
# Run NestJS orchestrator (new default)
yarn workspace @shopana/orchestrator-service dev

# Run legacy Moleculer orchestrator
yarn workspace @shopana/orchestrator-service dev:moleculer
```

### Production

```bash
yarn workspace @shopana/orchestrator-service build
yarn workspace @shopana/orchestrator-service start
```

### Legacy Moleculer Mode

```bash
yarn workspace @shopana/orchestrator-service start:moleculer
```

## Migration Guide

1. Add `createNestServiceAdapter(ServiceModule.default)` to orchestrator provider list.
2. Register the adapter with `NestBroker`.
3. Expose the Nest broker via the `'NEST_BROKER'` provider so services can inject it.
4. Run `yarn workspace @shopana/orchestrator-service dev` to validate.

## Troubleshooting

- **Service not found**: Ensure the service name exists in `config.yml` under `orchestrator.services` and the module exports a default schema.
- **Action not found**: Verify the action is declared in the schema's `actions` map.
- **Nest broker logs missing**: Check that `@shopana/shared-kernel` is installed and the orchestrator creates the `'NEST_BROKER'` provider.
