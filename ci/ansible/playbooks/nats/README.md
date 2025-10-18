# NATS Deployment with Ansible

This directory contains Ansible playbooks for deploying and managing NATS server on remote hosts.

## Overview

NATS is a high-performance messaging system used for microservices communication. This deployment includes:
- NATS Server with JetStream enabled
- HTTP monitoring interface
- Health checks
- Persistent storage for JetStream
- Optional NATS Surveyor monitoring UI

## Prerequisites

1. Ansible installed on control machine
2. Docker and Docker Compose installed on target hosts
3. SSH access to target hosts
4. Inventory file configured (`hosts.ini`)

## Configuration

### Variables

Configuration is managed through `sandbox.vars.yml` (or create environment-specific vars files).

Key variables:

```yaml
# NATS version
nats_version: "2.10"

# Ports
nats_port: 4222              # Client connection port
nats_http_port: 8222         # HTTP monitoring port
nats_cluster_port: 6222      # Cluster port (for future clustering)

# Authentication
nats_user: shopana
nats_password: "your_password"
nats_admin_password: "admin_password"

# JetStream settings
nats_jetstream_max_memory: "1GB"
nats_jetstream_max_file: "10GB"

# Features (disabled by default for sandbox)
nats_enable_tls: false
nats_enable_clustering: false
nats_enable_surveyor: false
```

### Security

**Important**: Set strong passwords via environment variables:

```bash
export NATS_PASSWORD="strong_password_here"
export NATS_ADMIN_PASSWORD="strong_admin_password"
export NATS_CLUSTER_PASSWORD="strong_cluster_password"
export NATS_LEAFNODE_PASSWORD="strong_leafnode_password"
```

## Deployment

### Deploy NATS

```bash
# Deploy to sandbox environment
ansible-playbook playbooks/nats/deploy.yml -i hosts.ini --limit shopana_sandbox

# Deploy with specific vars file
ansible-playbook playbooks/nats/deploy.yml -i hosts.ini --limit shopana_sandbox -e @playbooks/nats/production.vars.yml

# Deploy with password from environment
NATS_PASSWORD="secret123" ansible-playbook playbooks/nats/deploy.yml -i hosts.ini --limit shopana_sandbox
```

### Management Commands

```bash
# View logs
ssh <host> 'cd /opt/shopana/nats && docker compose logs -f'

# Restart NATS
ssh <host> 'cd /opt/shopana/nats && docker compose restart'

# Stop NATS
ssh <host> 'cd /opt/shopana/nats && docker compose stop'

# Start NATS
ssh <host> 'cd /opt/shopana/nats && docker compose start'

# View container status
ssh <host> 'cd /opt/shopana/nats && docker compose ps'
```

## Monitoring

### HTTP Endpoints

After deployment, NATS provides several monitoring endpoints:

```bash
# Health check
curl http://<host>:8222/healthz

# General server statistics
curl http://<host>:8222/varz

# Connection details
curl http://<host>:8222/connz

# Subscription details
curl http://<host>:8222/subsz

# JetStream statistics
curl http://<host>:8222/jsz

# Account information
curl http://<host>:8222/accountz
```

### NATS Surveyor (Optional)

Enable NATS Surveyor for web-based monitoring:

```yaml
nats_enable_surveyor: true
nats_surveyor_port: 7777
```

Access at: `http://<host>:7777`

## JetStream

JetStream is enabled by default and provides:
- Persistent messaging
- Stream processing
- Consumer groups
- Message replay

Storage location: `/opt/shopana/nats/nats-data/jetstream`

## Clustering (Optional)

For high availability, enable clustering:

```yaml
nats_enable_clustering: true
nats_cluster_name: "shopana_cluster"
nats_cluster_routes:
  - "nats-1"
  - "nats-2"
  - "nats-3"
```

## TLS/SSL (Recommended for Production)

Enable TLS for secure communication:

```yaml
nats_enable_tls: true
nats_tls_cert: "/path/to/cert.pem"
nats_tls_key: "/path/to/key.pem"
nats_tls_ca: "/path/to/ca.pem"
```

## Connection Examples

### Node.js (nats.js)

```javascript
import { connect } from 'nats';

const nc = await connect({
  servers: 'nats://shopana:password@host:4222',
});
```

### Go (nats.go)

```go
nc, err := nats.Connect("nats://shopana:password@host:4222")
```

### CLI (nats-cli)

```bash
# Install nats CLI
brew install nats-io/nats-tools/nats

# Connect
nats context save shopana --server=nats://host:4222 --user=shopana --password=password

# Publish message
nats pub app.v1.test "Hello NATS"

# Subscribe to messages
nats sub "app.v1.>"

# Create stream
nats stream add ORDERS --subjects="orders.>" --storage=file

# Add consumer
nats consumer add ORDERS ORDER_PROCESSOR
```

## Troubleshooting

### Check logs

```bash
ssh <host> 'cd /opt/shopana/nats && docker compose logs --tail=100'
```

### Check configuration

```bash
ssh <host> 'cat /opt/shopana/nats/config/nats-server.conf'
ssh <host> 'cat /opt/shopana/nats/.env'
```

### Port conflicts

```bash
# Clean up conflicting containers
ansible-playbook playbooks/cleanup/cleanup-port.yml -e 'cleanup_port=4222'
ansible-playbook playbooks/cleanup/cleanup-port.yml -e 'cleanup_port=8222'
```

### Connection issues

1. Check firewall rules allow ports 4222, 8222
2. Verify credentials in `.env` file
3. Check container health: `docker compose ps`
4. Test connection: `telnet <host> 4222`

### Data persistence

JetStream data is stored in Docker volumes:
- `nats-data`: JetStream storage
- `nats-logs`: Server logs

To backup:
```bash
ssh <host> 'docker run --rm -v nats-data:/data -v $(pwd):/backup alpine tar czf /backup/nats-backup.tar.gz -C /data .'
```

## Directory Structure

```
/opt/shopana/nats/
├── .env                    # Environment variables
├── docker-compose.yml      # Docker Compose configuration
└── config/
    └── nats-server.conf   # NATS server configuration
```

## Performance Tuning

For high-load environments, adjust these settings:

```yaml
nats_max_connections: 64000
nats_max_payload: 10485760  # 10MB
nats_max_pending_size: 67108864  # 64MB
nats_jetstream_max_memory: "2GB"
nats_jetstream_max_file: "50GB"
```

## Security Best Practices

1. **Use strong passwords**: Never use default passwords in production
2. **Enable TLS**: Encrypt all communication
3. **Use JWT authentication**: For better security than basic auth
4. **Restrict network access**: Use firewall rules
5. **Regular updates**: Keep NATS version up to date
6. **Monitor access**: Review `/connz` endpoint regularly
7. **Separate accounts**: Use different accounts for different services

## Support

- NATS Documentation: https://docs.nats.io/
- NATS GitHub: https://github.com/nats-io/nats-server
- JetStream Guide: https://docs.nats.io/nats-concepts/jetstream
