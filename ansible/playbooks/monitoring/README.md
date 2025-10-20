# Monitoring Stack Deployment

This playbook deploys a complete monitoring stack for Shopana services including:
- **Grafana** - Visualization and dashboards
- **Prometheus** - Metrics collection and storage
- **Loki** - Log aggregation system
- **Promtail** - Log collector for Docker containers
- **cAdvisor** - Container metrics exporter
- **Node Exporter** - Host metrics exporter
- **Moleculer Metrics** - Microservices metrics from all Moleculer services

## Prerequisites

- Ansible 2.9+
- Docker and Docker Compose installed on target host
- SSH access to target host
- `shopana-network` Docker network (created automatically)

## Quick Start

### Deploy Monitoring Stack

```bash
# Deploy to sandbox environment
ansible-playbook playbooks/monitoring/deploy.yml -i hosts.ini --limit shopana_sandbox
```

### Access Services

After deployment:
- **Grafana**: http://159.69.85.45:3100
  - Username: `admin`
  - Password: `shopana_admin_2024`
- **Prometheus**: http://159.69.85.45:9090
- **Loki**: http://159.69.85.45:3101
- **Promtail**: http://159.69.85.45:9080/targets

## Management Commands

### Start Services
```bash
ansible-playbook playbooks/monitoring/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=start"
```

### Stop Services
```bash
ansible-playbook playbooks/monitoring/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=stop"
```

### Restart Services
```bash
ansible-playbook playbooks/monitoring/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=restart"
```

### Check Status
```bash
ansible-playbook playbooks/monitoring/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=status"
```

### View Logs
```bash
ansible-playbook playbooks/monitoring/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=logs"
```

### Uninstall
```bash
ansible-playbook playbooks/monitoring/uninstall.yml -i hosts.ini --limit shopana_sandbox
```

## Using Grafana

### Quick Start with Loki

1. Open Grafana at http://159.69.85.45:3100
2. Login with credentials (see above)
3. Navigate to **Explore** (compass icon in left sidebar)
4. Select **Loki** as datasource
5. Start querying logs!

### Useful LogQL Queries

#### All Container Logs
```logql
{container_name=~".+"}
```

#### Logs by Compose Service
```logql
{compose_service="orders"}
{compose_service="platform"}
{compose_service="checkout"}
```

#### Logs by Compose Project
```logql
{compose_project="shopana"}
```

#### Filter by Log Level
```logql
{container_name=~".+"} |= "ERROR"
{container_name=~".+"} |= "WARN"
{container_name=~".+"} |= "INFO"
```

#### Multiple Filters
```logql
{compose_service="orders"} |= "ERROR" != "health"
```

#### Time Range
```logql
{container_name=~".+"} [5m]   # Last 5 minutes
{container_name=~".+"} [1h]   # Last hour
```

#### Rate of Errors
```logql
rate({container_name=~".+"} |= "ERROR" [5m])
```

#### Count by Label
```logql
sum by (compose_service) (count_over_time({container_name=~".+"}[5m]))
```

### Query Builder

Grafana provides a visual query builder for Loki:
1. Click on query field
2. Use the visual builder to:
   - Select labels
   - Add filters
   - Configure parsers
   - Format output

## Prometheus Metrics

Access Prometheus UI at http://159.69.85.45:9090

### Available Metrics

- **Container Metrics** (cAdvisor):
  - CPU usage: `container_cpu_usage_seconds_total`
  - Memory: `container_memory_usage_bytes`
  - Network: `container_network_receive_bytes_total`
  - Disk I/O: `container_fs_reads_bytes_total`

- **Host Metrics** (Node Exporter):
  - CPU: `node_cpu_seconds_total`
  - Memory: `node_memory_MemAvailable_bytes`
  - Disk: `node_filesystem_avail_bytes`
  - Network: `node_network_receive_bytes_total`

### Example PromQL Queries

```promql
# Container CPU usage per service
rate(container_cpu_usage_seconds_total{name=~".+"}[5m])

# Container memory usage
container_memory_usage_bytes{name=~".+"}

# Host CPU usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

## Configuration

### Main Configuration File
- `sandbox.vars.yml` - All configurable parameters

### Key Settings

```yaml
# Ports
grafana_port: 3100
prometheus_port: 9090
loki_port: 3101
promtail_port: 9080

# Data retention
prometheus_retention_time: "15d"
loki_retention_period: "168h"  # 7 days

# Credentials
grafana_admin_user: admin
grafana_admin_password: "shopana_admin_2024"
```

## Directory Structure

```
/opt/shopana/monitoring/
├── docker-compose.yml
└── config/
    ├── prometheus/
    │   └── prometheus.yml
    ├── loki/
    │   └── loki-config.yaml
    ├── promtail/
    │   └── promtail-config.yaml
    └── grafana/
        └── provisioning/
            ├── datasources/
            │   └── datasources.yml
            └── dashboards/
                ├── dashboards.yml
                └── json/
```

## SSH Commands

### View Real-time Logs

```bash
# All services
ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose logs -f'

# Specific service
ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose logs -f grafana'
ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose logs -f loki'
ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose logs -f promtail'
```

### Container Status

```bash
ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose ps'
```

### Restart Services

```bash
ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose restart'
```

## Troubleshooting

### Check if services are running

```bash
ansible-playbook playbooks/monitoring/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=status"
```

### View recent logs

```bash
ansible-playbook playbooks/monitoring/manage.yml -i hosts.ini --limit shopana_sandbox -e "action=logs"
```

### Grafana can't connect to datasources

1. Check if Prometheus and Loki are running:
   ```bash
   ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose ps'
   ```

2. Check Prometheus logs:
   ```bash
   ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose logs prometheus'
   ```

3. Check Loki logs:
   ```bash
   ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose logs loki'
   ```

### No logs appearing in Loki

1. Check Promtail is running:
   ```bash
   ssh root@159.69.85.45 'cd /opt/shopana/monitoring && docker compose logs promtail'
   ```

2. Check Promtail targets at http://159.69.85.45:9080/targets

3. Verify containers are producing logs:
   ```bash
   ssh root@159.69.85.45 'docker ps --format "table {{.Names}}\t{{.Status}}"'
   ```

### Port conflicts

If ports are already in use, you can clean them up:

```bash
ansible-playbook playbooks/cleanup/cleanup-port.yml -e "cleanup_port=3100"
```

Or change the ports in `sandbox.vars.yml` before deploying.

## Data Persistence

All data is stored in Docker volumes:
- `shopana-grafana-data` - Grafana dashboards and settings
- `shopana-prometheus-data` - Prometheus metrics (15 days retention)
- `shopana-loki-data` - Loki logs (7 days retention)
- `shopana-promtail-positions` - Promtail read positions

## Moleculer Services Metrics

The monitoring stack includes automatic collection of metrics from all Moleculer microservices.

### Available Dashboards

1. **Container Metrics** - CPU, Memory, Network usage of all containers
2. **Container Logs** - Real-time logs from all containers
3. **Services Health** - Health checks and status of services
4. **Moleculer Services** - Microservices-specific metrics:
   - Request rate per service/action
   - Average request duration
   - Error rate
   - Success rate
   - Active events
   - Node count

### Monitored Services

The following Moleculer services expose metrics on their dedicated ports:

| Service    | Metrics Port | Metrics Endpoint                  |
|------------|--------------|-----------------------------------|
| apps       | 3030         | http://159.69.85.45:3030/metrics |
| checkout   | 3031         | http://159.69.85.45:3031/metrics |
| delivery   | 3032         | http://159.69.85.45:3032/metrics |
| inventory  | 3033         | http://159.69.85.45:3033/metrics |
| orders     | 3034         | http://159.69.85.45:3034/metrics |
| payments   | 3035         | http://159.69.85.45:3035/metrics |
| platform   | 3036         | http://159.69.85.45:3036/metrics |
| pricing    | 3037         | http://159.69.85.45:3037/metrics |

### Key Metrics

Moleculer exposes the following Prometheus metrics:

- `moleculer_request_total` - Total number of requests
- `moleculer_request_time_sum` - Total time spent on requests
- `moleculer_request_time_count` - Number of timed requests
- `moleculer_request_error_total` - Total number of errors
- `moleculer_event_received_active` - Active events being processed
- `moleculer_nodes_total` - Number of nodes in the cluster

### Configuration

Metrics are configured in each service's `moleculer.ts` file:

```typescript
metrics: {
  enabled: true,
  reporter: [
    {
      type: "Prometheus",
      options: {
        port: parseInt(process.env.METRICS_PORT || "3030"),
        path: "/metrics",
        defaultLabels: (registry: any) => ({
          namespace: "platform",
          nodeID: "service-name",
        }),
      },
    },
  ],
}
```

You can override the metrics port using the `METRICS_PORT` environment variable for each service.


To backup volumes:
```bash
docker run --rm -v shopana-grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz -C /data .
```

## Performance Tuning

### For high log volumes

Edit `config/loki/loki-config.yaml.j2`:

```yaml
limits_config:
  ingestion_rate_mb: 100        # Increase from 50
  ingestion_burst_size_mb: 200  # Increase from 100
```

### For more metrics retention

Edit `sandbox.vars.yml`:

```yaml
prometheus_retention_time: "30d"      # Default: 15d
prometheus_retention_size: "20GB"     # Default: 10GB
loki_retention_period: "336h"         # 14 days (default: 168h)
```

Then redeploy:
```bash
ansible-playbook playbooks/monitoring/deploy.yml -i hosts.ini --limit shopana_sandbox
```

## Security Notes

- Grafana is currently configured without HTTPS (suitable for internal networks)
- Change default admin password in `sandbox.vars.yml` before production use
- Consider adding authentication to Prometheus and Loki for production
- Firewall rules should restrict access to monitoring ports

## Next Steps

1. Create custom Grafana dashboards for your services
2. Set up alerting rules in Prometheus
3. Configure Grafana alert notifications (email, Slack, etc.)
4. Add application-specific metrics exporters
5. Create Loki alert rules for log-based alerting

## Support

For issues or questions:
1. Check the logs using management commands
2. Review configuration files in `/opt/shopana/monitoring/config/`
3. Consult Grafana, Prometheus, and Loki documentation
