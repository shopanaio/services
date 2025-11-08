# Local Development Environment

Flexible Ansible-based local development environment for Shopana microservices.

## Overview

This system allows you to:

- ✅ Run **infrastructure services** (NATS, PostgreSQL, MinIO) in Docker
- ✅ Choose which **services run locally** (with hot reload) vs Docker
- ✅ Switch between **presets** for different workflows
- ✅ Use **tmux** for managing multiple services
- ✅ Generate helper scripts automatically

## Quick Start

```bash
# From services/ directory

# Minimal setup (fastest)
make dev:minimal

# Full local stack
make dev:fullstack

# Production-like
make dev:production-like

# Custom (edit vars/dev.yml first)
make dev:up
```

## Documentation

- **[Quick Start Guide](../../../docs/LOCAL_DEVELOPMENT_QUICKSTART.md)** - Get started in 2 minutes
- **[Full Guide (Russian)](../../../docs/LOCAL_DEVELOPMENT_RU.md)** - Complete documentation

## Files

```
local-dev/
├── README.md                      # This file
├── dev-up.yml                     # Main playbook to start environment
├── dev-down.yml                   # Playbook to stop environment
├── vars/
│   ├── dev.yml                    # Your custom configuration
│   ├── preset-minimal.yml         # Minimal preset
│   ├── preset-fullstack.yml       # Full stack preset
│   └── preset-production-like.yml # Production-like preset
└── templates/
    ├── start-local-services.sh.j2 # Template for service startup script
    └── start-platform.sh.j2       # Template for platform startup script
```

## Configuration

Edit `vars/dev.yml` to customize your environment:

```yaml
# Which services run in Docker vs locally
services:
  checkout:
    run_in_docker: false  # Run locally
    active_development: true

  payments:
    run_in_docker: true   # Run in Docker
    active_development: false

# Infrastructure
infrastructure:
  nats: true       # Always needed
  postgres: true   # false to use Neon cloud
  minio: true      # false to use remote S3
  apollo: false    # true to run Apollo Router

# Platform
platform:
  run_in_docker: false  # false = local go run
```

## Presets

### minimal
- **Infrastructure**: NATS only
- **Platform**: Docker
- **Services**: Orchestrator (all-in-one)
- **Database**: Neon cloud
- **Storage**: Remote S3
- **Use case**: Quick iteration, single service development

### fullstack
- **Infrastructure**: All local (NATS, PostgreSQL, MinIO, Apollo)
- **Platform**: Local (go run)
- **Services**: GraphQL local, Moleculer mixed
- **Database**: Local PostgreSQL
- **Storage**: Local MinIO
- **Use case**: Complete isolation, multi-service development

### production-like
- **Infrastructure**: All local
- **Platform**: Docker (built)
- **Services**: All in Docker
- **Database**: Local PostgreSQL
- **Storage**: Local MinIO
- **Use case**: Integration testing, pre-deployment validation

## How It Works

1. **Ansible reads** your configuration (`vars/dev.yml`)
2. **Starts infrastructure** using `docker-compose.dev-infrastructure.yml`
3. **Starts Docker services** using `docker-compose.dev-services.yml` with profiles
4. **Generates scripts** (`dev-start-services.sh`, `dev-start-platform.sh`)
5. **Creates `.env.dev`** with connection details

## Architecture

### Docker Compose Files

- **`docker-compose.dev-infrastructure.yml`** - NATS, PostgreSQL, MinIO, Apollo
  - Uses **profiles**: `local-db`, `local-storage`, `apollo`

- **`docker-compose.dev-services.yml`** - Application services
  - Uses **profiles**: `platform-docker`, `checkout-docker`, `orders-docker`, etc.

### Profiles

Profiles allow selective service startup:

```bash
# Start only checkout in Docker
docker-compose -f docker-compose.dev-services.yml \
  --profile checkout-docker up -d

# Start all GraphQL services
docker-compose -f docker-compose.dev-services.yml \
  --profile graphql-docker up -d
```

## Generated Files

After running `make dev:up`, you'll get:

- **`.env.dev`** - Environment variables for all services
- **`dev-start-services.sh`** - Script to start local services
- **`dev-start-platform.sh`** - Script to start platform service

## Commands

### Environment Management

```bash
make dev:up              # Start with dev.yml
make dev:up PRESET=...   # Start with specific preset
make dev:down            # Stop everything
make dev:status          # Show service status
make dev:logs            # Follow all logs
```

### Presets

```bash
make dev:minimal         # Minimal setup
make dev:fullstack       # Full stack setup
make dev:production-like # Production-like setup
```

### Individual Services

```bash
make dev:checkout        # Run checkout locally
make dev:orders          # Run orders locally
make dev:apps            # Run apps locally
make dev:inventory       # Run inventory locally
make dev:pricing         # Run pricing locally
make dev:shipping        # Run delivery locally
make dev:orchestrator    # Run orchestrator locally
```

## Creating Custom Presets

1. Copy an existing preset:
```bash
cp vars/preset-minimal.yml vars/my-custom.yml
```

2. Edit the configuration:
```yaml
# vars/my-custom.yml
dev_mode: hybrid

services:
  # Your custom service configuration
  checkout:
    run_in_docker: false
  # ...
```

3. Use it:
```bash
make dev:up PRESET=my-custom
```

## Troubleshooting

### Ansible fails with "vars file not found"

Ensure you're running from `services/` directory:
```bash
pwd  # Should be .../shopana-io/services
make dev:up
```

### Docker network doesn't exist

```bash
docker network create shopana-network
```

### Services can't connect to NATS

1. Check NATS is running:
```bash
docker ps | grep nats
```

2. Check NATS health:
```bash
curl http://localhost:8222/healthz
```

3. Verify connection string in `.env.dev`:
```bash
cat .env.dev | grep NATS
```

### Port conflicts

Edit `vars/dev.yml` to change ports:
```yaml
ports:
  checkout: 10012  # Changed from 10002
```

## Advanced Usage

### Using tmux

Enable in your config:
```yaml
preferences:
  use_tmux: true
```

Then:
```bash
make dev:up
./dev-start-services.sh  # Creates tmux session

# Attach to session
tmux attach-session -t shopana-dev

# Detach: Ctrl+B then D
# Switch windows: Ctrl+B then 0-9
```

### Debugging in Docker

Add to `docker-compose.dev-services.yml`:
```yaml
services:
  checkout:
    ports:
      - "9229:9229"  # Node.js debugger
    command: node --inspect=0.0.0.0:9229 dist/index.js
```

### Custom environment variables

Add to `vars/dev.yml`:
```yaml
env_vars:
  CUSTOM_VAR: custom_value
```

Available in `.env.dev` after running `make dev:up`.

## Tips

1. **Start minimal, scale up** - Begin with `preset-minimal`, add services as needed
2. **Use local only for active dev** - Keep non-development services in Docker
3. **Leverage hot reload** - Local services reload automatically on changes
4. **Rebuild packages when needed** - `make build:packages` after changing shared code
5. **Use tmux for multiple services** - Easier than managing many terminals

## Support

For issues or questions:
1. Check the logs: `make dev:logs`
2. Check the status: `make dev:status`
3. Read full docs: `docs/LOCAL_DEVELOPMENT_RU.md`
4. Clean restart: `make dev:down && make dev:up`

---

**Happy developing! 🚀**
