# Admin Application Deployment

Ansible playbooks for building and deploying admin application via Traefik on port 80.

## Structure

```
admin/
├── build.yml                  # Playbook for building Docker image
├── deploy.yml                 # Playbook for deployment via Traefik
├── docker-compose.yml.j2      # Docker compose template with Traefik labels
├── sandbox.vars.yml           # Variables for sandbox environment
├── staging.vars.yml           # Variables for staging environment
├── production.vars.yml        # Variables for production environment
└── README.md                  # This documentation
```

## Requirements

- Docker on local machine (for building)
- Docker on remote server (for deployment)
- Traefik running on remote server
- Configured `hosts.ini` with `shopana_sandbox` group
- Variables `shopana_ghcr_owner` and `shopana_ghcr_token` in inventory

## Configuration

### sandbox.vars.yml

```yaml
admin_env: production
admin_subdomain: "admin.shopana.io"
admin_api_url: "http://apollo-router-admin:4000/graphql"
admin_container_port: 80
admin_traefik_enabled: true
```

### Environment Variables

- `CMSCLIENT_ENV` - environment (production, staging, development)
- `CMSCLIENT_API_URL` - GraphQL API URL

## Usage

### 1. Build Docker Image

Build image locally and push to GitHub Container Registry:

```bash
cd /Users/phl/Projects/shopana-io/services

# Build for sandbox with latest tag
ansible-playbook ci/ansible/playbooks/admin/build.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox

# Build for staging
ansible-playbook ci/ansible/playbooks/admin/build.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_staging \
  -e "vars_file=staging.vars.yml"

# Build for production
ansible-playbook ci/ansible/playbooks/admin/build.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_production \
  -e "vars_file=production.vars.yml"

# Build with custom tag
ansible-playbook ci/ansible/playbooks/admin/build.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox \
  -e "image_tag=v1.0.0"
```

### 2. Deploy to Server

Deploy image to remote server via Traefik:

```bash
# Deploy to sandbox (latest version)
ansible-playbook ci/ansible/playbooks/admin/deploy.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox

# Deploy to staging
ansible-playbook ci/ansible/playbooks/admin/deploy.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_staging \
  -e "vars_file=staging.vars.yml"

# Deploy to production
ansible-playbook ci/ansible/playbooks/admin/deploy.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_production \
  -e "vars_file=production.vars.yml"

# Deploy specific version to sandbox
ansible-playbook ci/ansible/playbooks/admin/deploy.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox \
  -e "image_tag=v1.0.0"
```

### 3. Full Cycle: Build + Deploy

```bash
# Build
ansible-playbook ci/ansible/playbooks/admin/build.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox

# Deploy
ansible-playbook ci/ansible/playbooks/admin/deploy.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox
```

## Docker Compose

Generated from template `docker-compose.yml.j2` with the following configuration:

```yaml
services:
  admin:
    image: ghcr.io/OWNER/admin:TAG
    container_name: shopana-admin
    restart: unless-stopped
    networks:
      - shopana-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`admin.shopana.io`)"
      - "traefik.http.routers.admin.entrypoints=web"
      - "traefik.http.services.admin.loadbalancer.server.port=80"
```

## Traefik Integration

Admin application automatically registers in Traefik via Docker labels:

- **Router**: `admin`
- **Rule**: `Host('admin.shopana.io')`
- **EntryPoint**: `web` (port 80)
- **Service Port**: 80

### Access

After deployment, the application is available at:
- http://admin.shopana.io

## Management

### View Logs

```bash
ssh root@your-server 'cd /opt/shopana/admin && docker compose logs -f'
```

### Restart

```bash
ssh root@your-server 'cd /opt/shopana/admin && docker compose restart'
```

### Stop

```bash
ssh root@your-server 'cd /opt/shopana/admin && docker compose stop'
```

### Remove

```bash
ssh root@your-server 'cd /opt/shopana/admin && docker compose down'
```

## Troubleshooting

### Check Container Status

```bash
ssh root@your-server 'cd /opt/shopana/admin && docker compose ps'
```

### Check Logs

```bash
ssh root@your-server 'cd /opt/shopana/admin && docker compose logs --tail=100'
```

### Check Traefik

```bash
# Verify admin is registered in Traefik
curl http://your-server:8080/api/http/routers | jq '.[] | select(.name | contains("admin"))'
```

### Rebuild and Redeploy

```bash
# Rebuild image
ansible-playbook ci/ansible/playbooks/admin/build.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox

# Redeploy
ansible-playbook ci/ansible/playbooks/admin/deploy.yml \
  -i ci/ansible/hosts.ini \
  --limit shopana_sandbox
```

## Architecture

```
┌──────────────────────────────────────┐
│         Internet (Port 80)           │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│         Traefik (Port 80)            │
│  - Routes: admin.shopana.io          │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│     Admin Container (Port 80)        │
│  - Nginx serving React app           │
│  - API calls to Apollo Router        │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│   Apollo Router Admin (Port 4000)    │
│  - GraphQL Gateway                   │
└──────────────────────────────────────┘
```

## Notes

- Admin application is built as a static site (React + Webpack)
- Uses multi-stage Dockerfile (build + nginx)
- API URL is configured at build time via build args
- Traefik automatically discovers the container via Docker labels
- Container runs nginx on port 80 serving the built React application
- All GraphQL requests are proxied to Apollo Router Admin API
