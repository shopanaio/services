# Services Build and Push Playbooks

Ansible playbooks for building and pushing all service Docker images to GitHub Container Registry (GHCR).

## Prerequisites

1. **Docker** must be running locally
2. **GitHub Personal Access Token** with `write:packages` permission
3. **Environment variables** set:
   ```bash
   export SHOPANA_GHCR_OWNER=shopanaio          # or your org/username
   export SHOPANA_GITHUB_TOKEN=ghp_xxxxx        # GitHub PAT with packages:write
   ```

## Playbooks

### 1. Build and Push All Services

Builds and pushes all 8 microservices to GHCR.

**File:** `build.yml`

**Usage:**
```bash
# From ci/ansible directory
ansible-playbook playbooks/services/build.yml
```

**Services built:**
- `apps-service`
- `checkout-service`
- `delivery-service`
- `inventory-service`
- `orders-service`
- `payments-service`
- `platform-service`
- `pricing-service`

### 2. Build Single Service

To build just one service, use the `build_single.yml` playbook:

```bash
ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout"
```

## Configuration

### Image Tags

You can customize image tags using environment variables:

```bash
# Set default tag for all services
export SERVICES_IMAGE_TAG=v1.2.3

# Or set individual service tags
export CHECKOUT_SERVICE_IMAGE_TAG=v1.2.3
export ORDERS_SERVICE_IMAGE_TAG=v1.2.4

# Then run the playbook
ansible-playbook playbooks/services/build.yml
```

### Available Tag Variables

- `SERVICES_IMAGE_TAG` - Default tag for all services (default: `latest`)
- `APPS_SERVICE_IMAGE_TAG` - Tag for apps service
- `CHECKOUT_SERVICE_IMAGE_TAG` - Tag for checkout service
- `DELIVERY_SERVICE_IMAGE_TAG` - Tag for delivery service
- `INVENTORY_SERVICE_IMAGE_TAG` - Tag for inventory service
- `ORDERS_SERVICE_IMAGE_TAG` - Tag for orders service
- `PAYMENTS_SERVICE_IMAGE_TAG` - Tag for payments service
- `PLATFORM_SERVICE_IMAGE_TAG` - Tag for platform service
- `PRICING_SERVICE_IMAGE_TAG` - Tag for pricing service

## Examples

### Build all services with default tag
```bash
export SHOPANA_GHCR_OWNER=shopanaio
export SHOPANA_GITHUB_TOKEN=ghp_xxxxx
ansible-playbook playbooks/services/build.yml
```

### Build all services with custom version
```bash
export SHOPANA_GHCR_OWNER=shopanaio
export SHOPANA_GITHUB_TOKEN=ghp_xxxxx
export SERVICES_IMAGE_TAG=v1.0.0
ansible-playbook playbooks/services/build.yml
```

### Build with different tags for different services
```bash
export SHOPANA_GHCR_OWNER=shopanaio
export SHOPANA_GITHUB_TOKEN=ghp_xxxxx
export CHECKOUT_SERVICE_IMAGE_TAG=v1.2.0
export ORDERS_SERVICE_IMAGE_TAG=v1.2.1
export SERVICES_IMAGE_TAG=v1.1.0  # for other services
ansible-playbook playbooks/services/build.yml
```

### Build single service
```bash
export SHOPANA_GHCR_OWNER=shopanaio
export SHOPANA_GITHUB_TOKEN=ghp_xxxxx
ansible-playbook playbooks/services/build_single.yml -e "service_name=checkout" -e "image_tag=v1.2.3"
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
- Ensure the service builds successfully locally: `cd services/X && yarn build`
- Check for TypeScript errors in the service
- Verify all dependencies are properly installed

### Service Not Found
```
Error: Service 'X' not found in services/ directory
```

**Solution:**
- Verify the service name is correct (use lowercase)
- Check the service exists in `services/` directory
- Available services: apps, checkout, delivery, inventory, orders, payments, platform, pricing

## CI/CD Integration

These playbooks can be integrated into CI/CD pipelines:

### Woodpecker CI Example
```yaml
steps:
  - name: build-and-push-services
    image: ansible/ansible:latest
    environment:
      - SHOPANA_GHCR_OWNER=shopanaio
      - SHOPANA_GITHUB_TOKEN:
          from_secret: github_token
      - SERVICES_IMAGE_TAG=${CI_COMMIT_TAG}
    commands:
      - cd ci/ansible
      - ansible-playbook playbooks/services/build.yml
```

### GitHub Actions Example
```yaml
- name: Build and Push Services
  env:
    SHOPANA_GHCR_OWNER: ${{ github.repository_owner }}
    SHOPANA_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SERVICES_IMAGE_TAG: ${{ github.ref_name }}
  run: |
    cd ci/ansible
    ansible-playbook playbooks/services/build.yml
```

## Related Playbooks

- `playbooks/apollo/build.yml` - Build Apollo Router and Rover images
- `playbooks/woodpecker-config-service/build.yml` - Build Woodpecker Config Service
