# Woodpecker CI Local Development

## Quick Start

### 1. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `Woodpecker CI Local`
   - Homepage URL: `http://localhost:8000`
   - Authorization callback URL: `http://localhost:8000/authorize`
4. Save Client ID and Client Secret

### 2. Configure Environment

```bash
cp env.example .env
```

Edit `.env` and set:
- `WOODPECKER_ADMIN` - your GitHub username
- `WOODPECKER_GITHUB_CLIENT` - OAuth Client ID
- `WOODPECKER_GITHUB_SECRET` - OAuth Client Secret
- `WOODPECKER_AGENT_SECRET` - generate random string

### Configuration Extension (Convert)

Set the Woodpecker Convert Extension endpoint and shared secret. The endpoint must point to the root of the convert server (POST `/`).

Example `.env` variables:

```bash
# If the convert server runs in the same Docker network
WOODPECKER_CONVERT_PLUGIN_ENDPOINT=http://woodpecker-pipeline:3000/

# Or if it is exposed publicly
# WOODPECKER_CONVERT_PLUGIN_ENDPOINT=https://convert.example.com/

WOODPECKER_CONVERT_PLUGIN_SECRET=<shared-secret>
```

Notes:
- The same `WOODPECKER_CONVERT_PLUGIN_SECRET` must be configured on the convert server (`ci/woodpecker-pipeline`).
- Use HTTPS for public endpoints.

### 3. Start Woodpecker

```bash
docker-compose -f docker-compose.woodpecker.yml up -d
```

### 4. Access UI

Open http://localhost:8000 and login with GitHub

### 5. Activate Repository

In Woodpecker UI, find your repository and click "Activate"

### 6. Configure Webhook (Optional)

For local development, GitHub webhooks won't reach localhost. Options:

**Option A: Use ngrok**
```bash
ngrok http 8000
# Update WOODPECKER_HOST in .env with ngrok URL
# Restart containers
```

**Option B: Use Polling**
Add to docker-compose environment:
```yaml
- WOODPECKER_REPOSITORY_WEBHOOK_INTERVAL=30s
```

## Woodpecker CLI

For local development, you can install Woodpecker CLI to test pipelines locally without pushing to the server.

### Installation

**macOS:**
```bash
brew install woodpecker-ci/tap/woodpecker-cli
```

**Linux:**
```bash
curl -L https://github.com/woodpecker-ci/woodpecker/releases/latest/download/woodpecker-cli_linux_amd64.tar.gz | tar xz
sudo mv woodpecker-cli /usr/local/bin/
```

**Windows:**
Download from [GitHub Releases](https://github.com/woodpecker-ci/woodpecker/releases)

### Usage

Test pipeline locally:
```bash
woodpecker-cli exec
```

Connect to Woodpecker server:
```bash
export WOODPECKER_SERVER=http://localhost:8000
export WOODPECKER_TOKEN=<your-token>
woodpecker-cli info
```

See [Woodpecker CLI documentation](https://woodpecker-ci.org/docs/usage/cli) for more commands.

## Pipeline Configuration

Create `.woodpecker.yml` in repository root or `.woodpecker/*.yml` for multiple pipelines.

See `woodpecker.example.yml` for examples.

## Logs

```bash
docker-compose -f docker-compose.woodpecker.yml logs -f
```

## Stop

```bash
docker-compose -f docker-compose.woodpecker.yml down
```

## Clean Data

```bash
rm -rf ./data/woodpecker
```
