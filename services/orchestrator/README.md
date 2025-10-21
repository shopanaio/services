# Service Orchestrator

Service orchestrator for running multiple Shopana microservices in a single process with in-memory communication.

## Overview

The orchestrator allows you to run multiple services together in development or resource-constrained environments, eliminating the need for external message brokers like NATS and reducing latency through in-memory communication.

## Features

- **Dynamic Service Loading**: Load any combination of services based on configuration
- **In-Memory Communication**: Zero-latency service-to-service calls when using `null` transporter
- **NATS Support**: Can also run with NATS for distributed deployments
- **Graceful Shutdown**: Proper cleanup of all loaded services
- **Metrics**: Built-in Prometheus metrics endpoint
- **REPL**: Interactive debugging console in development mode

## Configuration

Configuration is loaded from `config.yml` in the workspace root under the `orchestrator` section:

```yaml
orchestrator:
  mode: orchestrator
  services:
    - apps
    - payments
    - inventory
    - delivery
    - pricing
```

**Note:** `checkout` and `orders` services always run standalone and are not included in the orchestrator.

### Environment Variables

```bash
# Transporter (null for in-memory, NATS for distributed)
ORCHESTRATOR_TRANSPORTER=null
# or
ORCHESTRATOR_TRANSPORTER=nats://localhost:4222

# Logging
LOG_LEVEL=info

# Metrics
METRICS_PORT=3030

# Environment
NODE_ENV=development
```

## Available Services

Services loaded by orchestrator (configured in `config.yml`):

- `apps` - Apps management service
- `payments` - Payment processing service
- `inventory` - Inventory management service
- `pricing` - Pricing and promotions service
- `delivery` - Delivery and shipping service

**Always standalone** (not in orchestrator):
- `checkout` - Checkout process service
- `orders` - Order management service

## Usage

### Development

```bash
# Run with default configuration from config.yml
yarn dev

# Run with watch mode
yarn dev:watch

# Run with custom services
ORCHESTRATOR_SERVICES=apps,checkout,orders yarn dev
```

### Production

```bash
# Build
yarn build

# Start
yarn start
```

## Architecture

The orchestrator uses Moleculer's service broker to:

1. Load service definitions dynamically from configured paths
2. Create service instances in a single process
3. Enable in-memory or NATS-based communication
4. Provide unified metrics and monitoring

### Service Registry

Services are registered in `SERVICES_REGISTRY` with their relative paths:

```typescript
const SERVICES_REGISTRY = {
  apps: { path: "../../apps/src/service.ts" },
  payments: { path: "../../payments/src/service.ts" },
  // ... other services
};
```

## Monitoring

- **Metrics**: Available at `http://localhost:3030/metrics` (Prometheus format)
- **REPL**: Enabled in development mode for interactive debugging

## Graceful Shutdown

The orchestrator handles `SIGINT`, `SIGTERM`, and uncaught exceptions, ensuring all services are properly stopped before exit.

## Comparison with Standalone Services

| Feature | Orchestrator | Standalone Services |
|---------|-------------|---------------------|
| Process Count | 1 (multiple services) | N (one per service) |
| Communication | In-memory or NATS | NATS required |
| Latency | ~0ms (in-memory) | Network latency |
| Resource Usage | Lower | Higher |
| Scalability | Limited | Unlimited |
| Services | apps, payments, inventory, delivery, pricing | All services including checkout, orders |
| Best For | Development, testing | Production, distributed systems |

## Troubleshooting

### Service fails to load

Check that:
1. Service path in `SERVICES_REGISTRY` is correct
2. Service has a default export with Moleculer service definition
3. All service dependencies are installed

### High memory usage

Consider:
1. Running fewer services in orchestrator mode
2. Using standalone mode for production
3. Adjusting Moleculer cacher settings

## Related

- `@shopana/shared-service-config` - Configuration management
- Individual service README files for service-specific documentation
