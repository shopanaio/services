# Apollo Router Deployment

Apollo Router configuration and deployment playbooks for Admin and Storefront GraphQL APIs.

## Overview

Apollo Router acts as a GraphQL gateway, federating multiple subgraph services into unified Admin and Storefront APIs.

## Configuration

### Apollo Router Paths

Both routers expose their GraphQL endpoints on:
- **Path**: `/graphql`
- **Admin Port**: 4000
- **Storefront Port**: 4001

### Subgraph Services

**Admin API subgraphs:**
- Platform Admin: `http://platform:8000/api/admin/graphql`
- Apps Admin: `http://apps:10001/graphql`
- Orders Admin: `http://orders:10003/graphql/admin/v1`

**Storefront API subgraphs:**
- Platform Storefront: `http://platform:8000/api/client/graphql`
- Checkout: `http://checkout:10002/graphql`
- Orders Storefront: `http://orders:10003/graphql/storefront/v1`

## Deployment

### Export Schemas

Export subgraph schemas before deployment:

```bash
ansible-playbook playbooks/apollo/schema-export.yml -i hosts.ini
```

### Deploy to Remote Server

```bash
ansible-playbook playbooks/apollo/deploy.yml -i hosts.ini --limit shopana_sandbox
```

### Local Development

```bash
ansible-playbook playbooks/apollo/local.yml
```

## Network

Apollo Router containers must be on the `shopana-network` to communicate with:
- Traefik (for reverse proxy)
- Subgraph services (platform, apps, orders, checkout)

Create the network first:
```bash
ansible-playbook playbooks/network/setup.yml -i hosts.ini --limit shopana_sandbox
```

## Accessing the APIs

After deployment:

- **Admin GraphQL**: `http://HOST:4000/graphql`
- **Storefront GraphQL**: `http://HOST:4001/graphql`
- **Admin Health**: `http://HOST:8088/health`
- **Storefront Health**: `http://HOST:8089/health`

## Files

- `deploy.yml` - Deploy to remote server
- `local.yml` - Local development deployment
- `build.yml` - Build router images
- `schema-export.yml` - Export subgraph schemas
- `schema-compose.yml` - Compose supergraph schemas
- `config/docker-compose.yml.j2` - Docker Compose template
- `config/admin/router-admin.yaml.j2` - Admin router configuration
- `config/storefront/router-storefront.yaml.j2` - Storefront router configuration

## Variables

Configuration in `vars.deploy.yml`:

```yaml
# Ports
apollo_router_admin_port: 4000
apollo_router_admin_health_port: 8088
apollo_router_storefront_port: 4001
apollo_router_storefront_health_port: 8089

# Admin API subgraph URLs
apollo_platform_admin_url: http://platform:8000/api/admin/graphql
apollo_apps_admin_url: http://apps:10001/graphql

# Storefront API subgraph URLs
apollo_platform_storefront_url: http://platform:8000/api/client/graphql
apollo_checkout_storefront_url: http://checkout:10002/graphql
apollo_orders_storefront_url: http://orders:10003/graphql/storefront/v1
```

## Integration with Traefik

If using Traefik as reverse proxy:

1. Ensure `shopana-network` exists
2. Apollo Router containers are automatically discovered by Traefik via container names
3. Access via Traefik ports (configured in Traefik playbook)

## Troubleshooting

### Check container status
```bash
ssh HOST 'cd /opt/shopana/apollo-router && docker compose ps'
```

### View logs
```bash
ssh HOST 'cd /opt/shopana/apollo-router && docker compose logs -f'
```

### Test GraphQL endpoint
```bash
curl -X POST http://HOST:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'
```

### Check health
```bash
curl http://HOST:8088/health
curl http://HOST:8089/health
```

## References

- [Apollo Router Documentation](https://www.apollographql.com/docs/router/)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)
