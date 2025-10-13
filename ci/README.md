# CI/CD Infrastructure

This directory contains CI/CD infrastructure configuration for [Shopana.io](https://shopana.io).

## Contents

### Ansible

The `ansible/` directory contains Ansible playbooks for setting up and managing CI/CD infrastructure:

- **install-woodpecker.yml** - Install Woodpecker CI server and agent
- **install-docker.yml** - Install Docker on remote hosts
- **manage-woodpecker.yml** - Manage Woodpecker CI service (start/stop/restart)
- **update-woodpecker-config.yml** - Update Woodpecker configuration
- **woodpecker-update-tag.yml** - Update Woodpecker version
- **uninstall-woodpecker.yml** - Uninstall Woodpecker CI
- **hello-world.yml** - Test playbook for connectivity

## Quick Start

### Prerequisites

Install required Ansible collections:

```bash
ansible-galaxy install -r ansible/requirements.yml
```

### Configuration

1. Copy the example environment file:
   ```bash
   cp ansible/woodpecker.env.example ansible/.env
   ```

2. Edit `ansible/.env` with your configuration:
   - Set `WOODPECKER_HOST` to your CI server URL
   - Set `WOODPECKER_ADMIN` to GitHub admin usernames
   - Configure GitHub OAuth credentials
   - Set `WOODPECKER_AGENT_SECRET` for agent authentication

3. Configure inventory in `ansible/inventory/hosts.py`

### Deployment

Install Woodpecker CI:
```bash
cd ansible
ansible-playbook install-woodpecker.yml
```

## More Information

Visit [https://shopana.io](https://shopana.io) for more details about the Shopana platform.
