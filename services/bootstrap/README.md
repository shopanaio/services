# Bootstrap

Modular monolith - composition root for Shopana services.

## Overview

Bootstrap is a modular monolith that runs all Shopana services in a single process. All service modules are loaded and communicate via RabbitMQ.

## Configuration

Configuration is loaded from `config.yml` in the workspace root under the `bootstrap` section:

```yaml
bootstrap:
  services:
    - apps
    - payments
    - inventory
    - delivery
    - pricing
    - checkout
    - orders
    - media
```

### Environment Variables

```bash
# RabbitMQ connection
RABBITMQ_URL=amqp://localhost:5672

# Logging
LOG_LEVEL=info

# Metrics
METRICS_PORT=3030

# Environment
NODE_ENV=development
```

## Services

All services are loaded as NestJS modules:

- `apps` - Apps management
- `payments` - Payment processing
- `inventory` - Inventory management
- `pricing` - Pricing and promotions
- `delivery` - Delivery and shipping
- `checkout` - Checkout process
- `orders` - Order management
- `media` - Media management

## Usage

### Development

```bash
yarn dev
```

### Production

```bash
yarn build
yarn start
```

## Architecture

Bootstrap uses NestJS to:

1. Load all service modules
2. Connect to RabbitMQ for messaging
3. Provide unified metrics and monitoring

## Monitoring

- **Metrics**: Available at `http://localhost:3030/metrics` (Prometheus format)

## Graceful Shutdown

Handles `SIGINT`, `SIGTERM`, and uncaught exceptions, ensuring all services are properly stopped before exit.
