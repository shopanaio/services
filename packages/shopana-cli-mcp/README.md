# @shopana/cli-mcp-server

MCP Server for working with Shopana CLI. Provides tools for managing Shopana platform development through Model Context Protocol.

## Features

### Tools

| Tool | Description |
|------|-------------|
| `shopana_build` | Build packages and services |
| `shopana_dev` | Start dev environment |
| `shopana_codegen` | Generate TypeScript types from GraphQL |
| `shopana_migrate` | Run database migrations |
| `shopana_db_generate` | Generate migrations from schema |
| `shopana_gateway` | Start GraphQL gateway |
| `shopana_schema` | Manage GraphQL schemas |
| `shopana_list_services` | List all services with their capabilities |
| `shopana_project_info` | Full project and architecture information |

## Installation

### Local Installation

```bash
cd packages/shopana-cli-mcp
yarn install
yarn build
```

### Global Installation (npm)

```bash
npm install -g @shopana/cli-mcp-server
```

## Usage

### Starting the Server

```bash
# After building
node dist/index.js

# Or via npx (after publishing)
npx @shopana/cli-mcp-server
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopana-cli": {
      "command": "node",
      "args": ["/path/to/packages/shopana-cli-mcp/dist/index.js"],
      "env": {
        "SHOPANA_WORKING_DIR": "/path/to/services"
      }
    }
  }
}
```

### Claude Code Configuration

Add to project's `.mcp.json`:

```json
{
  "mcpServers": {
    "shopana-cli": {
      "command": "node",
      "args": ["./packages/shopana-cli-mcp/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Building the Project

```
Use shopana_build to build all packages
```

### Starting Development

```
Start dev server for inventory service
```

### Generating Migrations

```
Generate migrations for checkout service after schema changes
```

### Getting Project Information

```
Show project information and available services
```

### Troubleshooting

```
Help fix error "Cannot find module @shopana/shared-kernel"
```

## Available Services

- `apps` - Application management
- `bootstrap` - Service orchestrator
- `checkout` - Cart and checkout flow
- `delivery` - Delivery integration
- `iam` - Identity and access management
- `inventory` - Products and stock
- `listing` - Product listings
- `media` - File storage
- `orders` - Order processing
- `payments` - Payment integration
- `pricing` - Price calculation
- `project` - Project settings
- `reviews` - Product reviews
- `search` - Search functionality

## Development

```bash
# Development with hot-reload
yarn dev

# Build
yarn build

# Run
yarn start
```

## License

MIT
