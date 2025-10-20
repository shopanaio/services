# Services Build and Deploy Playbooks

Ansible playbooks for building, pushing, and deploying service Docker images to GitHub Container Registry (GHCR) and remote servers.

## Architecture Overview

The services use a **hybrid deployment architecture**:

- **Orchestrator** (one container): Runs multiple services in a single process with in-memory communication
  - Services: `apps`, `platform`, `payments`, `inventory`, `delivery`
  - Port: `10001` (apps GraphQL API)
  - Image: `orchestrator-service`
  - Communication: In-memory (zero latency, no NATS needed)

- **Standalone** (separate containers): Services that require isolation
  - `checkout` - Port `10002`
  - `orders` - Port `10003`
  - Communication: Via NATS with orchestrator

This architecture reduces resource usage while maintaining isolation for critical services.

## Prerequisites

1. **Docker** must be running locally
2. **GitHub Personal Access Token** with `write:packages` permission
3. **Environment variables** set:

   **Option A: Using .env file (Recommended)**
   ```bash
   cd ansible
   cp env.example .env
   vim .env  # Edit and fill in your values

   # Load environment variables and run playbook
   source env.sh && ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout"
   ```

   **Option B: Export manually**
   ```bash
   export SHOPANA_GHCR_OWNER=shopanaio          # or your org/username
   export SHOPANA_GITHUB_TOKEN=ghp_xxxxx        # GitHub PAT with packages:write

   ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout"
   ```

   > **Important:** Переменные окружения должны быть загружены **перед** запуском `ansible-playbook`.
   > Используйте `source env.sh` для загрузки из `.env` файла.

## Available Playbooks

### Build Orchestrator Service

Builds and pushes the orchestrator service that runs multiple services in one container.

**File:** `build_orchestrator.yml`

**Usage:**
```bash
# Build with latest tag
cd ansible
source env.sh && ansible-playbook playbooks/services/build_orchestrator.yml

# Build with specific version
source env.sh && ansible-playbook playbooks/services/build_orchestrator.yml -e "image_tag=v1.2.3"
```

**What it does:**
- Builds `apps` service as entry point (contains orchestrator logic)
- Tags and pushes as `orchestrator-service:tag`
- Orchestrator will load: apps, platform, payments, inventory, delivery at runtime

### Deploy Orchestrator Service

Deploys the orchestrator to remote server.

**File:** `deploy_orchestrator.yml`

**Usage:**
```bash
# Deploy with latest tag
ansible-playbook playbooks/services/deploy_orchestrator.yml -i hosts.ini --limit shopana_sandbox

# Deploy with specific version
ansible-playbook playbooks/services/deploy_orchestrator.yml -i hosts.ini --limit shopana_sandbox -e "image_tag=v1.2.3"
```

**What it does:**
- Creates `/opt/shopana/services/orchestrator/` directory
- Generates `config.yml` with orchestrator mode enabled
- Generates `.env` with database URLs for all services
- Deploys single container running multiple services
- Exposes only port 10001 (apps GraphQL API)

### Build Single Service (Standalone)

Builds and pushes a standalone service to GHCR. Use this for `checkout` and `orders`.

**File:** `build_single.yml`

**Usage:**
```bash
# Build checkout service
cd ansible
source env.sh && ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout"

# Build orders service with specific version
source env.sh && ansible-playbook playbooks/services/build_single.yml -e "service_name=orders" -e "image_tag=v1.2.3"
```

**Note:** Only use this for `checkout` and `orders`. Other services are deployed via orchestrator.

### Deploy Single Service (Standalone)

Deploys a standalone service to remote server. Use this for `checkout` and `orders`, or for debugging individual services.

**File:** `deploy_single.yml`

**Usage:**
```bash
# Deploy checkout
ansible-playbook playbooks/services/deploy_single.yml -i hosts.ini --limit shopana_sandbox -e "service_name=checkout"

# Deploy orders with specific version
ansible-playbook playbooks/services/deploy_single.yml -i hosts.ini --limit shopana_sandbox -e "service_name=orders" -e "image_tag=v1.2.3"
```

**What it does:**
- Creates deployment directory on remote server
- Generates `.env` file from template with secrets
- Generates `config.yml` for service configuration
- Generates `docker-compose.yml` from template
- Mounts `.env` and `config.yml` as Docker secrets
- Pulls latest image from GHCR
- Starts service with health checks

**Note:** For services in orchestrator (apps, platform, payments, inventory, delivery), use `deploy_orchestrator.yml` instead.

### Build All Services

Builds orchestrator and standalone services.

**Recommended approach:**
```bash
cd ansible
source env.sh

# 1. Build base image (if packages changed)
ansible-playbook playbooks/services/build_base.yml -e "image_tag=v1.2.3"

# 2. Build orchestrator
ansible-playbook playbooks/services/build_orchestrator.yml -e "image_tag=v1.2.3"

# 3. Build standalone services
ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout" -e "image_tag=v1.2.3"
ansible-playbook playbooks/services/build_single.yml -e "service_name=orders" -e "image_tag=v1.2.3"
```

### Deploy All Services

Deploys the complete hybrid architecture: orchestrator + standalone services.

**File:** `deploy_all.yml`

**Usage:**
```bash
# Deploy all with latest tag
ansible-playbook playbooks/services/deploy_all.yml -i hosts.ini --limit shopana_sandbox

# Deploy all with specific version
ansible-playbook playbooks/services/deploy_all.yml -i hosts.ini --limit shopana_sandbox -e "image_tag=v1.2.3"
```

**What it deploys:**
1. **Orchestrator** (one container at `/opt/shopana/services/orchestrator/`)
   - apps, platform, payments, inventory, delivery
   - Port: 10001

2. **Standalone services** (separate containers)
   - checkout → Port 10002
   - orders → Port 10003

**Features:**
- Deploys orchestrator first, then standalone services
- Continues on error (won't stop if one component fails)
- Shows summary with all service URLs
- Each component in isolated directory

## Configuration

### Image Tags

Image tags can be specified in three ways (priority order):

1. **CLI parameter:** `-e "image_tag=v1.2.3"`
2. **Service-specific environment variable:** `export CHECKOUT_SERVICE_IMAGE_TAG=v1.2.3`
3. **Default:** `latest`

**Environment variables for individual services:**
- `APPS_SERVICE_IMAGE_TAG`
- `CHECKOUT_SERVICE_IMAGE_TAG`
- `DELIVERY_SERVICE_IMAGE_TAG`
- `INVENTORY_SERVICE_IMAGE_TAG`
- `ORDERS_SERVICE_IMAGE_TAG`
- `PAYMENTS_SERVICE_IMAGE_TAG`
- `PLATFORM_SERVICE_IMAGE_TAG`
- `PRICING_SERVICE_IMAGE_TAG`

### Heartbeat Settings

Moleculer uses heartbeat mechanism to detect node availability in the cluster.

**Configuration:**
```yaml
# In sandbox.vars.yml
heartbeat_interval: 10  # Send heartbeat every 10 seconds
heartbeat_timeout: 30   # Consider node dead after 30 seconds without heartbeat
```

**Recommendations:**
- **Standard (default):** `interval: 10, timeout: 30` - Good for stable networks
- **Aggressive:** `interval: 5, timeout: 15` - Fast failure detection, but sensitive to temporary delays
- **Conservative:** `interval: 15, timeout: 45` - Tolerant to network issues, but slower failure detection

**Guidelines:**
- `timeout` should be at least 3x `interval` (to allow 2-3 missed heartbeats)
- Too aggressive values cause false disconnections during GC pauses or CPU spikes
- Too conservative values delay detection of real failures

**Override per deployment:**
```bash
# Deploy with custom heartbeat for unstable network
ansible-playbook playbooks/services/deploy_single.yml \
  -i hosts.ini --limit shopana_sandbox \
  -e "service_name=checkout" \
  -e "heartbeat_interval=15" \
  -e "heartbeat_timeout=45"
```

## Examples

### Complete Build and Deploy Flow

```bash
cd ansible
source env.sh

# 1. Build base image (if packages changed)
ansible-playbook playbooks/services/build_base.yml -e "image_tag=v1.2.3"

# 2. Build orchestrator
ansible-playbook playbooks/services/build_orchestrator.yml -e "image_tag=v1.2.3"

# 3. Build standalone services
ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout" -e "image_tag=v1.2.3"
ansible-playbook playbooks/services/build_single.yml -e "service_name=orders" -e "image_tag=v1.2.3"

# 4. Deploy everything
ansible-playbook playbooks/services/deploy_all.yml -i hosts.ini --limit shopana_sandbox -e "image_tag=v1.2.3"
```

### Deploy Only Orchestrator

```bash
ansible-playbook playbooks/services/deploy_orchestrator.yml -i hosts.ini --limit shopana_sandbox
```

### Deploy Only Standalone Service

```bash
ansible-playbook playbooks/services/deploy_single.yml -i hosts.ini --limit shopana_sandbox -e "service_name=checkout"
```

### Quick Development Iteration

```bash
# Rebuild and redeploy orchestrator
cd ansible
source env.sh
ansible-playbook playbooks/services/build_orchestrator.yml -e "image_tag=dev"
ansible-playbook playbooks/services/deploy_orchestrator.yml -i hosts.ini --limit shopana_sandbox -e "image_tag=dev"
```

## Image Naming Convention

Images are pushed to GHCR with the following naming pattern:

```
ghcr.io/{OWNER}/{SERVICE_NAME}-service:{TAG}
```

Examples:
- `ghcr.io/shopanaio/orchestrator-service:latest` - Contains apps, platform, payments, inventory, delivery
- `ghcr.io/shopanaio/checkout-service:latest` - Standalone checkout service
- `ghcr.io/shopanaio/orders-service:v1.2.3` - Standalone orders service

## Orchestrator Configuration

The orchestrator mode is controlled by `config.yml` in the service root:

```yaml
orchestrator:
  mode: orchestrator  # "standalone" | "orchestrator"
  services:
    - apps
    - platform
    - payments
    - inventory
    - delivery
```

This configuration is automatically generated by Ansible during deployment from `config-orchestrator.yml.j2` template.

### How It Works

1. **Entry Point**: `services/apps/src/index.ts` checks the mode
2. **Orchestrator**: `services/apps/src/orchestrator.ts` loads all services dynamically
3. **Communication**: In-memory (Moleculer with `transporter: null`)
4. **External Communication**: Via NATS to standalone services (checkout, orders)

### Environment Variables

The orchestrator supports environment overrides:

```bash
SERVICES_MODE=orchestrator           # Override config.yml mode
ORCHESTRATOR_SERVICES=apps,platform  # Override which services to load
```

## Troubleshooting

### Authentication Failed
```
Error: denied: permission_denied
```

**Solution:**
- Ensure your GitHub token has `write:packages` permission
- Verify `SHOPANA_GHCR_OWNER` matches your GitHub username or organization
- Check token is not expired
- Try: `echo $SHOPANA_GITHUB_TOKEN | docker login ghcr.io -u $SHOPANA_GHCR_OWNER --password-stdin`

### Docker Not Running
```
Error: Cannot connect to the Docker daemon
```

**Solution:**
- Start Docker Desktop or Docker daemon
- Run `docker info` to verify Docker is running

### Build Failed
```
Error: Service X build failed - dist directory not found
```

**Solution:**
- Ensure the service builds successfully locally first:
  ```bash
  cd services/X
  yarn install
  yarn build
  ```
- Check for TypeScript errors in the service
- Verify all workspace packages are built: `yarn workspaces foreach --include "packages/*" run build`

### Invalid Service Name
```
Error: Invalid service name: X. Valid services: apps, checkout, ...
```

**Solution:**
- For orchestrator: Use `build_orchestrator.yml` (no service name needed)
- For standalone: Use `build_single.yml` with `service_name=checkout` or `service_name=orders`
- Don't try to build orchestrator services individually (apps, platform, etc.)

### Orchestrator Not Starting
```
Error: Service X failed to load
```

**Solution:**
- Check orchestrator logs: `ssh server 'cd /opt/shopana/services/orchestrator && docker compose logs'`
- Verify config.yml has correct orchestrator configuration
- Ensure all service paths in orchestrator.ts are correct
- Check database URLs are set for all services in .env

### Missing Environment Variables
```
Error: Required variables missing. Provide SHOPANA_GHCR_OWNER and SHOPANA_GITHUB_TOKEN
```

**Solution:**
```bash
export SHOPANA_GHCR_OWNER=shopanaio
export SHOPANA_GITHUB_TOKEN=ghp_xxxxx
# Verify
echo $SHOPANA_GHCR_OWNER
echo $SHOPANA_GITHUB_TOKEN | cut -c1-10
```

## CI/CD Integration

These playbooks can be integrated into CI/CD pipelines:

### Woodpecker CI Example (Single Service)
```yaml
steps:
  - name: build-checkout-service
    image: ansible/ansible:latest
    environment:
      - SHOPANA_GHCR_OWNER=shopanaio
      - SHOPANA_GITHUB_TOKEN:
          from_secret: github_token
    commands:
      - cd ansible
      - ansible-playbook playbooks/services/build_single.yml
          -e "service_name=checkout"
          -e "image_tag=${CI_COMMIT_TAG:-latest}"
```

### Woodpecker CI Example (All Services)
```yaml
steps:
  - name: build-all-services
    image: ansible/ansible:latest
    environment:
      - SHOPANA_GHCR_OWNER=shopanaio
      - SHOPANA_GITHUB_TOKEN:
          from_secret: github_token
    commands:
      - cd ansible
      - |
        for service in apps checkout delivery inventory orders payments platform pricing; do
          ansible-playbook playbooks/services/build_single.yml \
            -e "service_name=$service" \
            -e "image_tag=${CI_COMMIT_TAG:-latest}"
        done
```

### GitHub Actions Example
```yaml
- name: Build and Push Service
  env:
    SHOPANA_GHCR_OWNER: ${{ github.repository_owner }}
    SHOPANA_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    cd ansible
    ansible-playbook playbooks/services/build_single.yml \
      -e "service_name=checkout" \
      -e "image_tag=${{ github.ref_name }}"
```

### GitHub Actions Matrix Example (Parallel Build)
```yaml
strategy:
  matrix:
    service: [apps, checkout, delivery, inventory, orders, payments, platform, pricing]
steps:
  - name: Build ${{ matrix.service }} service
    env:
      SHOPANA_GHCR_OWNER: ${{ github.repository_owner }}
      SHOPANA_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      cd ansible
      ansible-playbook playbooks/services/build_single.yml \
        -e "service_name=${{ matrix.service }}" \
        -e "image_tag=${{ github.ref_name }}"
```

## Files Structure

```
ansible/playbooks/services/
├── build_orchestrator.yml           # Build and push orchestrator service
├── build_single.yml                 # Build and push standalone service (checkout, orders)
├── build_base.yml                   # Build base image with packages
├── deploy_orchestrator.yml          # Deploy orchestrator to remote server
├── deploy_orchestrator_task.yml     # Reusable orchestrator deploy task
├── deploy_single.yml                # Deploy standalone service to remote server
├── deploy_all.yml                   # Deploy orchestrator + standalone services
├── deploy_service_task.yml          # Reusable deploy task for standalone services
├── config-orchestrator.yml.j2       # Orchestrator configuration template
├── config.yml.j2                    # Standalone service configuration template
├── env-orchestrator.j2              # Orchestrator environment variables template
├── env.j2                           # Standalone service environment variables template
├── docker-compose-orchestrator.yml.j2  # Orchestrator Docker Compose template
├── docker-compose.yml.j2            # Standalone service Docker Compose template
├── sandbox.vars.yml                 # Service configuration variables
└── README.md                        # This documentation
```

## Related Playbooks

- `playbooks/apollo/build.yml` - Build Apollo Router and Rover images
- `playbooks/woodpecker-workflows/build.yml` - Build Woodpecker Config Service

## Architecture

### Build Process

The service build uses a multi-stage Docker build process:

1. **Dependencies Stage**: Install all workspace dependencies
2. **Builder Stage**: Build all packages and the target service
3. **Production Dependencies Stage**: Install only production dependencies
4. **Runtime Stage**: Create minimal production image with built artifacts

See `Dockerfile` for implementation details.

### Platform Support

- **Platform**: `linux/amd64` (default)
- Multi-platform builds can be enabled by modifying the `platform` variable in playbooks
