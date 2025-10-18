# Traefik Reverse Proxy Ansible Playbooks

Ansible playbooks for deploying and managing Traefik reverse proxy for Apollo Router services.

## Overview

Traefik is configured as a reverse proxy to route traffic to Apollo Router services (Admin and Storefront APIs).

**⚠️ This configuration works WITHOUT SSL/HTTPS** - all traffic is over HTTP only.

It provides:

- **HTTP routing** for Apollo GraphQL services
- **Dashboard** for monitoring and debugging
- **Docker provider** for automatic service discovery
- **Health checks** and monitoring

## Files

- `deploy.yml` - Main deployment playbook
- `manage.yml` - Service management (start/stop/restart/status)
- `update-config.yml` - Update configuration with minimal downtime
- `uninstall.yml` - Complete service removal
- `sandbox.vars.yml` - Sandbox environment variables
- `docker-compose.yml.j2` - Docker Compose template
- `traefik.yml.j2` - Traefik static configuration template

## Quick Start

### Prerequisites

**Important:** Ensure the Docker network exists before deploying Traefik:

```bash
# Create the shared Docker network
ansible-playbook playbooks/network/setup.yml -i hosts.ini --limit shopana_sandbox
```

This network is required for Traefik to communicate with Apollo Router and other services.

### Deploy Traefik

```bash
# Deploy to sandbox environment
ansible-playbook playbooks/traefik/deploy.yml -i hosts.ini --limit shopana_sandbox
```

### Update Configuration

Update configuration with minimal downtime:

```bash
# Update Traefik configuration
ansible-playbook playbooks/traefik/update-config.yml -i hosts.ini --limit shopana_sandbox
```

This will:
- Update configuration files
- Restart only if needed
- Minimize downtime (hot reload for dynamic config)

### Manage Service

```bash
# Restart Traefik
ansible-playbook playbooks/traefik/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=restart"

# Stop Traefik
ansible-playbook playbooks/traefik/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=stop"

# Start Traefik
ansible-playbook playbooks/traefik/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=start"

# Check status
ansible-playbook playbooks/traefik/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=status"

# View logs
ansible-playbook playbooks/traefik/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=logs"
```

### Uninstall

```bash
# Remove Traefik completely
ansible-playbook playbooks/traefik/uninstall.yml -i hosts.ini --limit shopana_sandbox
```

## Configuration

### Port Configuration

Default ports (configured in `sandbox.vars.yml`):

- **80** - HTTP entrypoint (routes both admin and storefront)
- **8080** - Traefik dashboard

Traefik routes requests by path:
- `/api/admin/graphql/*` → Apollo Admin Router
- `/api/client/graphql/*` → Apollo Storefront Router

### Apollo Router Integration

Traefik can work in two modes:

#### Mode 1: Port Forwarding Only (Default)
- Traefik exposes ports 4000 and 4001
- Apollo Router runs separately (deployed via `apollo/deploy.yml`)
- Set `traefik_enable_apollo_routes: false` in vars

#### Mode 2: Integrated Apollo Router
- Traefik manages Apollo Router containers
- Apollo Router services are defined in docker-compose
- Set `traefik_enable_apollo_routes: true` in vars
- Requires Apollo Router configs in `/opt/shopana/apollo-router/config/`

### Environment Variables

Key variables in `sandbox.vars.yml`:

```yaml
# Basic configuration
traefik_version: "v3.0"
traefik_web_port: 80
traefik_dashboard_port: 8080

# Apollo ports
traefik_apollo_admin_port: 4000
traefik_apollo_storefront_port: 4001

# Dashboard
traefik_enable_dashboard: true
traefik_dashboard_insecure: true

# Logging
traefik_log_level: "INFO"
traefik_log_format: "json"
```

## Endpoints

After deployment (all traffic via port 80):

- **Dashboard**: `http://HOST:8080/dashboard/`
- **Traefik API**: `http://HOST:8080/api/`
- **Apollo Admin GraphQL**: `http://HOST/api/admin/graphql/query`
- **Apollo Storefront GraphQL**: `http://HOST/api/client/graphql/query`
- **Health Check**: `http://HOST:8082/ping`

Traefik automatically routes requests to Apollo Router by path.

## Docker Labels

Traefik uses Docker labels for service discovery. Example for a service:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.myservice.rule=Host(`example.com`)"
  - "traefik.http.routers.myservice.entrypoints=web"
  - "traefik.http.services.myservice.loadbalancer.server.port=8080"
```

## Troubleshooting

### Check container status
```bash
ssh HOST 'cd /opt/shopana/traefik && docker compose ps'
```

### View logs
```bash
ssh HOST 'cd /opt/shopana/traefik && docker compose logs -f'
```

### Check configuration
```bash
ssh HOST 'cat /opt/shopana/traefik/config/traefik.yml'
```

### Port conflicts
```bash
# Cleanup port conflicts
ansible-playbook playbooks/cleanup/cleanup-port.yml -e 'cleanup_port=80'
```

### Restart service
```bash
ansible-playbook playbooks/traefik/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=restart"
```

## Network

Traefik connects to the `shopana-network` Docker network to communicate with Apollo Router and other services.

**Important:** The network must exist before deploying any services. Create it with:

```bash
ansible-playbook playbooks/network/setup.yml -i hosts.ini --limit shopana_sandbox
```

### Network Architecture

```
┌─────────────────┐
│     Traefik     │ (shopana-network)
│   (port 80)     │
└────────┬────────┘
         │
         ├──► Apollo Admin (shopana-apollo-admin:4000)
         │
         ├──► Apollo Storefront (shopana-apollo-storefront:4001)
         │
         └──► Other services...
```

Ensure all services that need to be accessible through Traefik are on the same network:

```yaml
networks:
  - shopana-network
```

### Connecting Services to Traefik

Services can be discovered by Traefik using container names as hostnames:

- `shopana-apollo-admin` → Apollo Admin Router
- `shopana-apollo-storefront` → Apollo Storefront Router
- Container names are defined in docker-compose files

## Security Notes

- Dashboard is insecure by default (password not required)
- All traffic is unencrypted HTTP
- Suitable for development/sandbox environments only

## References

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
- [Middlewares](https://doc.traefik.io/traefik/middlewares/overview/)
