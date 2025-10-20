# Local NATS Development Setup

This guide explains how to deploy NATS locally for development using Ansible.

## Quick Start

### Deploy NATS locally

```bash
cd ansible
ansible-playbook playbooks/nats/local-deploy.yml
```

This will:
- Generate configuration files in `ansible/.local/nats/`
- Start NATS server with Docker Compose
- Enable JetStream
- Set up monitoring endpoints

### Stop NATS

```bash
cd ansible
ansible-playbook playbooks/nats/local-stop.yml
```

### Restart NATS

Simply run the deploy command again:

```bash
cd ansible
ansible-playbook playbooks/nats/local-deploy.yml
```

### Stop and remove all data

```bash
cd ansible/.local/nats
docker compose down -v
```

## Connection

### Node.js

```javascript
import { connect } from 'nats';

const nc = await connect({
  servers: 'nats://shopana:shopana_dev_password@127.0.0.1:4222',
});

console.log('Connected to NATS!');
```

### Go

```go
package main

import (
    "github.com/nats-io/nats.go"
)

func main() {
    nc, _ := nats.Connect("nats://shopana:shopana_dev_password@127.0.0.1:4222")
    defer nc.Close()
}
```

### Environment Variables

Services can use these environment variables:

```bash
NATS_URL=nats://shopana:shopana_dev_password@127.0.0.1:4222
```

## Monitoring

### Health Check

```bash
curl http://127.0.0.1:8222/healthz
```

### Server Stats

```bash
curl http://127.0.0.1:8222/varz
```

### JetStream Info

```bash
curl http://127.0.0.1:8222/jsz
```

### Connection Info

```bash
curl http://127.0.0.1:8222/connz
```

### View Logs

```bash
cd ansible/.local/nats
docker compose logs -f
```

## Configuration

### Customize Settings

Edit `ansible/playbooks/nats/dev.vars.yml` to customize:

- Port numbers
- Memory limits
- JetStream storage
- Authentication credentials

Then redeploy:

```bash
cd ansible
ansible-playbook playbooks/nats/local-deploy.yml
```

### Default Settings

- **Client Port:** 4222
- **HTTP Monitoring:** 8222
- **User:** shopana
- **Password:** shopana_dev_password
- **JetStream Memory:** 512MB
- **JetStream Disk:** 5GB

## Testing with NATS CLI

### Install NATS CLI

```bash
# macOS
brew install nats-io/nats-tools/nats

# Or download from https://github.com/nats-io/natscli/releases
```

### Create Context

```bash
nats context save local \
  --server=nats://127.0.0.1:4222 \
  --user=shopana \
  --password=shopana_dev_password

nats context select local
```

### Publish Message

```bash
nats pub app.v1.test "Hello NATS"
```

### Subscribe to Messages

```bash
nats sub "app.v1.>"
```

### Create JetStream Stream

```bash
nats stream add ORDERS \
  --subjects="orders.>" \
  --storage=file \
  --retention=limits \
  --max-msgs=-1 \
  --max-age=24h
```

### Add Consumer

```bash
nats consumer add ORDERS ORDER_PROCESSOR \
  --ack=explicit \
  --deliver=all \
  --max-deliver=3
```

## Troubleshooting

### Port Already in Use

If ports 4222 or 8222 are already in use:

```bash
# Find process using the port
lsof -i :4222
lsof -i :8222

# Kill the process or stop the service
```

### Check Container Status

```bash
cd ansible/.local/nats
docker compose ps
```

### View Recent Logs

```bash
cd ansible/.local/nats
docker compose logs --tail=50
```

### Reset Everything

```bash
cd ansible/.local/nats
docker compose down -v
cd ../../
ansible-playbook playbooks/nats/local-deploy.yml
```

## Directory Structure

```
ansible/
├── .local/
│   └── nats/
│       ├── .env                    # Generated environment variables
│       ├── docker-compose.yml      # Generated Docker Compose config
│       └── config/
│           └── nats-server.conf   # Generated NATS config
└── playbooks/
    └── nats/
        ├── dev.vars.yml           # Development configuration
        ├── local-deploy.yml       # Local deployment playbook
        ├── local-stop.yml         # Stop playbook
        └── LOCAL.md               # This file
```

## Integration with Services

### Moleculer Broker

```javascript
// moleculer.config.ts
export default {
  transporter: {
    type: 'NATS',
    options: {
      url: process.env.NATS_URL || 'nats://shopana:shopana_dev_password@127.0.0.1:4222',
    },
  },
};
```

### Environment Variables

Add to your `.env` files:

```bash
NATS_URL=nats://shopana:shopana_dev_password@127.0.0.1:4222
```

## Production vs Development

| Feature | Development | Production |
|---------|------------|------------|
| Authentication | Simple password | Strong passwords + JWT |
| TLS | Disabled | Enabled |
| JetStream Memory | 512MB | 1GB+ |
| JetStream Disk | 5GB | 10GB+ |
| Max Connections | 1000 | 64000 |
| Clustering | Disabled | Optional |
| Monitoring UI | Optional | Recommended |

## Next Steps

- Read the main [NATS README](./README.md) for production deployment
- Review [NATS Documentation](https://docs.nats.io/)
- Explore [JetStream Guide](https://docs.nats.io/nats-concepts/jetstream)
