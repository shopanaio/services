# Services Build and Deploy Playbooks

Ansible playbooks for building, pushing, and deploying service Docker images to GitHub Container Registry (GHCR) and remote servers.

## Prerequisites

1. **Docker** must be running locally
2. **GitHub Personal Access Token** with `write:packages` permission
3. **Environment variables** set:

   **Option A: Using .env file (Recommended)**
   ```bash
   cd ci/ansible
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

### Build Single Service

Builds and pushes a single service to GHCR.

**File:** `build_single.yml`

**Usage:**
```bash
# Option 1: Using wrapper script (easiest)
cd ci/ansible
./ansible-run.sh playbooks/services/build_single.yml -e "service_name=checkout"
./ansible-run.sh playbooks/services/build_single.yml -e "service_name=checkout" -e "image_tag=v1.2.3"

# Option 2: Manual source and run
cd ci/ansible
source env.sh && ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout"
source env.sh && ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout" -e "image_tag=v1.2.3"
```

### Deploy Single Service

Deploys a single service to remote server using Docker Compose with secrets.

**File:** `deploy_single.yml`

**Usage:**
```bash
# Deploy with latest tag
ansible-playbook playbooks/services/deploy_single.yml -i hosts.ini --limit shopana_sandbox -e "service_name=checkout"

# Deploy with specific version
ansible-playbook playbooks/services/deploy_single.yml -i hosts.ini --limit shopana_sandbox -e "service_name=checkout" -e "image_tag=v1.2.3"
```

**What it does:**
- Creates deployment directory on remote server
- Generates `.env` file from template with secrets
- Generates `config.yml` for service configuration
- Generates `docker-compose.yml` from template
- Mounts `.env` and `config.yml` as Docker secrets
- Pulls latest image from GHCR
- Starts service with health checks

**Required variables** (defined in `sandbox.vars.yml`):
- `shopana_ghcr_owner` - GitHub Container Registry owner
- `shopana_ghcr_token` - GitHub PAT with packages:read
- `{service_name}_port` - Port for the service
- `{service_name}_database_url` - Database connection URL

### Build All Services

Builds and pushes all services to GHCR sequentially.

**File:** `build_all.yml`

**Usage:**
```bash
# Build all with latest tag
ansible-playbook playbooks/services/build_all.yml

# Build all with specific version
ansible-playbook playbooks/services/build_all.yml -e "image_tag=v1.2.3"
```

**Features:**
- Validates Docker is running
- Validates GHCR credentials
- Builds all services sequentially
- Shows progress and summary

### Deploy All Services

Deploys all services to remote server sequentially.

**File:** `deploy_all.yml`

**Usage:**
```bash
# Deploy all with latest tag
ansible-playbook playbooks/services/deploy_all.yml -i hosts.ini --limit shopana_sandbox

# Deploy all with specific version
ansible-playbook playbooks/services/deploy_all.yml -i hosts.ini --limit shopana_sandbox -e "image_tag=v1.2.3"
```

**Features:**
- Deploys one service at a time (sequential)
- Continues on error (won't stop if one service fails)
- Shows summary at the end with all service URLs
- Each service in isolated directory

**Available services:**
- `apps` → `apps-service` (port 10001)
- `checkout` → `checkout-service` (port 10002)
- `delivery` → `delivery-service` (port 10004)
- `inventory` → `inventory-service` (port 10005)
- `orders` → `orders-service` (port 10003)
- `payments` → `payments-service` (port 10006)
- `platform` → `platform-service` (port 10007)
- `pricing` → `pricing-service` (port 10008)

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

## Examples

### Build a single service with default tag (latest)
```bash
cd ci/ansible

# Using wrapper script
./ansible-run.sh playbooks/services/build_single.yml -e "service_name=checkout"
```

### Build with custom version tag
```bash
cd ci/ansible

# Using wrapper script
./ansible-run.sh playbooks/services/build_single.yml -e "service_name=checkout" -e "image_tag=v1.2.3"
```

### Build using environment variable for tag
```bash
cd ci/ansible
# Set variable in .env file: CHECKOUT_SERVICE_IMAGE_TAG=v1.2.0

# Using wrapper script (loads .env automatically)
./ansible-run.sh playbooks/services/build_single.yml -e "service_name=checkout"
```

### Build all services sequentially
```bash
cd ci/ansible
source env.sh
export IMAGE_TAG=v1.0.0

# Build all services with the same tag
for service in apps checkout delivery inventory orders payments platform pricing; do
  ./ansible-run.sh playbooks/services/build_single.yml -e "service_name=$service" -e "image_tag=$IMAGE_TAG"
done
```

## Image Naming Convention

Images are pushed to GHCR with the following naming pattern:

```
ghcr.io/{OWNER}/{SERVICE_NAME}-service:{TAG}
```

Examples:
- `ghcr.io/shopanaio/checkout-service:latest`
- `ghcr.io/shopanaio/orders-service:v1.2.3`
- `ghcr.io/shopanaio/inventory-service:dev`

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
- Use lowercase service name without `-service` suffix
- Valid names: `apps`, `checkout`, `delivery`, `inventory`, `orders`, `payments`, `platform`, `pricing`
- Example: use `checkout` not `checkout-service`

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
      - cd ci/ansible
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
      - cd ci/ansible
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
    cd ci/ansible
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
      cd ci/ansible
      ansible-playbook playbooks/services/build_single.yml \
        -e "service_name=${{ matrix.service }}" \
        -e "image_tag=${{ github.ref_name }}"
```

## Files Structure

```
ci/ansible/playbooks/services/
├── build_single.yml          # Build and push single service to GHCR
├── build_all.yml             # Build and push all services to GHCR
├── build_service_task.yml    # Reusable build task (included by build_all.yml)
├── deploy_single.yml         # Deploy single service to remote server
├── deploy_all.yml            # Deploy all services to remote server
├── deploy_service_task.yml   # Reusable deploy task (included by deploy_all.yml)
├── env.j2                    # Environment variables template
├── config.yml.j2             # Service configuration template
├── docker-compose.yml.j2     # Docker Compose template with secrets
├── sandbox.vars.yml          # Service configuration variables
└── README.md                 # This documentation
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

See `ci/images/services/Dockerfile` for implementation details.

### Platform Support

- **Platform**: `linux/amd64` (default)
- Multi-platform builds can be enabled by modifying the `platform` variable in playbooks
