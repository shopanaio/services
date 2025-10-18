# Casdoor Authentication Service Deployment

Ansible playbooks for deploying and managing Casdoor authentication service with Traefik integration.

## Overview

Casdoor is an open-source Identity and Access Management (IAM) / Single-Sign-On (SSO) platform that provides authentication and authorization services.

## Features

- **Traefik Integration**: Exposed via reverse proxy for secure access
- **PostgreSQL Backend**: Uses external PostgreSQL database
- **Health Checks**: Built-in container health monitoring
- **Docker Compose**: Containerized deployment
- **Configuration Management**: Template-based configuration

## Prerequisites

- Ansible 2.9+
- Docker and Docker Compose on target hosts
- Traefik reverse proxy deployed
- PostgreSQL database (local or remote)
- `shopana-network` Docker network

## Configuration

### Variables File: `sandbox.vars.yml`

```yaml
# Casdoor version
casdoor_version: "latest"

# Application configuration
casdoor_app_name: "casdoor"
casdoor_port: 9011
casdoor_run_mode: "prod"

# Traefik integration
casdoor_traefik_path: "/auth"
casdoor_traefik_strip_prefix: false
casdoor_domain: "http://your-domain.com/auth"

# Database configuration
casdoor_db_driver: "postgres"
casdoor_db_host: "your-db-host.com"
casdoor_db_port: 5432
casdoor_db_name: "casdoor"
casdoor_db_user: "casdoor_user"
casdoor_db_password: "your-secure-password"
casdoor_db_ssl_mode: "require"

# Database options
casdoor_table_prefix: ""
casdoor_show_sql: "false"
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `casdoor_port` | Internal application port | `9011` |
| `casdoor_db_host` | Database hostname | `db.example.com` |
| `casdoor_db_name` | Database name | `casdoor` |
| `casdoor_db_user` | Database username | `casdoor_user` |
| `casdoor_db_password` | Database password | `secure_password` |
| `casdoor_domain` | Public domain URL | `http://example.com/auth` |
| `casdoor_traefik_path` | URL path prefix | `/auth` |

## Deployment

### 1. Deploy Casdoor

```bash
ansible-playbook playbooks/casdoor/deploy.yml -i hosts.ini --limit shopana_sandbox
```

This will:
- Create deployment directory `/opt/shopana/casdoor`
- Generate configuration files from templates
- Deploy Docker container with Traefik labels
- Configure health checks
- Start the service

### 2. Verify Deployment

```bash
# Check service status
ansible-playbook playbooks/casdoor/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=status"

# View logs
ansible-playbook playbooks/casdoor/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=logs"
```

### 3. Access Casdoor

- **Via Traefik**: `http://your-host/auth`
- **Health Check**: Container healthcheck runs internally

## Management

### Service Management

```bash
# Start service
ansible-playbook playbooks/casdoor/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=start"

# Stop service
ansible-playbook playbooks/casdoor/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=stop"

# Restart service
ansible-playbook playbooks/casdoor/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=restart"

# Check status
ansible-playbook playbooks/casdoor/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=status"

# View logs
ansible-playbook playbooks/casdoor/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=logs"
```

### Update Configuration

```bash
# Update configuration and restart
ansible-playbook playbooks/casdoor/update-config.yml -i hosts.ini --limit shopana_sandbox
```

This will:
- Backup current configuration
- Generate new configuration from templates
- Restart the service
- Display startup logs

### Uninstall

```bash
# Remove Casdoor service
ansible-playbook playbooks/casdoor/uninstall.yml -i hosts.ini --limit shopana_sandbox
```

This will:
- Stop and remove containers
- Create configuration backup
- Remove deployment directory

## Architecture

### Directory Structure

```
/opt/shopana/casdoor/
├── docker-compose.yml      # Docker Compose configuration
├── .env                    # Environment variables (sensitive)
└── config/
    └── app.conf           # Casdoor application configuration
```

### Docker Network

Casdoor connects to the `shopana-network` Docker network, which is shared with:
- Traefik reverse proxy
- Apollo Router
- Other Shopana services

### Traefik Integration

Casdoor is exposed through Traefik with the following labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.casdoor.rule=PathPrefix(`/auth`)"
  - "traefik.http.routers.casdoor.entrypoints=web"
  - "traefik.http.services.casdoor.loadbalancer.server.port=9011"
```

This makes Casdoor accessible at: `http://your-host/auth`

## Database Setup

### PostgreSQL Requirements

Casdoor requires a PostgreSQL database. You can use:
- External managed database (e.g., Neon, AWS RDS)
- Self-hosted PostgreSQL container
- Existing PostgreSQL instance

### Connection String Format

```
user=USERNAME password=PASSWORD host=HOSTNAME port=5432 sslmode=require dbname=DBNAME
```

### Initial Setup

Casdoor will automatically create necessary tables on first run with the `-createDatabase=true` flag.

## Security Considerations

1. **Database Credentials**: Stored in `.env` file with `0600` permissions
2. **SSL/TLS**: Enable `casdoor_db_ssl_mode: "require"` for database connections
3. **Network Isolation**: Runs in isolated Docker network
4. **Traefik**: Acts as reverse proxy, add authentication middleware if needed

## Monitoring

### Health Checks

Container includes health check:
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "-q", "http://localhost:9011/api/health"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 30s
```

### Logs

```bash
# Follow logs in real-time
ssh your-host 'cd /opt/shopana/casdoor && docker compose logs -f'

# View last 100 lines
ssh your-host 'cd /opt/shopana/casdoor && docker compose logs --tail=100'
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
ansible-playbook playbooks/casdoor/manage.yml -e "action=logs"

# Check container status
ssh your-host 'cd /opt/shopana/casdoor && docker compose ps'

# Check port conflicts
ssh your-host 'lsof -i :9011'
```

### Database Connection Issues

```bash
# Verify environment variables
ssh your-host 'cat /opt/shopana/casdoor/.env'

# Test database connection
ssh your-host 'docker exec shopana-casdoor wget -O- http://localhost:9011/api/health'
```

### Traefik Routing Issues

```bash
# Check Traefik dashboard
http://your-host:8080/dashboard/

# Verify network connectivity
ssh your-host 'docker network inspect shopana-network'

# Check container labels
ssh your-host 'docker inspect shopana-casdoor | grep -A 20 Labels'
```

### Clean Port

```bash
ansible-playbook playbooks/cleanup/cleanup-port.yml -e 'cleanup_port=9011'
```

## Related Services

- **Traefik**: Reverse proxy for routing
- **Platform Service**: Main GraphQL API
- **Apollo Router**: GraphQL federation

## References

- [Casdoor Documentation](https://casdoor.org/docs/overview)
- [Casdoor Docker Hub](https://hub.docker.com/r/casbin/casdoor)
- [Traefik Documentation](https://doc.traefik.io/traefik/)

## Support

For issues or questions:
1. Check Casdoor logs
2. Verify Traefik routing
3. Confirm database connectivity
4. Review configuration templates
