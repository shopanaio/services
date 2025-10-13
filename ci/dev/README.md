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
