# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopana import plugin that parses Facebook-compatible CSV feeds from Tilda and generates standardized inventory update tasks. The plugin is part of the larger Shopana platform's plugin architecture and implements the "import" domain.

## Build & Development Commands

```bash
# Build the plugin (uses shared esbuild config from parent)
yarn build

# Run TypeScript compiler in watch mode (type-checking only, no emit)
yarn build:watch

# Run all tests
yarn test

# Run a single test file
yarn test src/__tests__/facebook-feed-hash-parser.test.ts
```

## Architecture Overview

### Plugin Structure

This plugin follows the Shopana CorePlugin contract defined in `@shopana/plugin-sdk`:

- **plugin.ts**: Exports the plugin manifest, lifecycle hooks (init, healthCheck), and factory function that creates the provider
- **provider.ts**: Contains `TildaImportProvider` class with two main namespaces:
  - `import.*`: Feed parsing operations (listRecords, listHashes)
  - `inventory.*`: Inventory task creation (createUpdateTask)
- **config.ts**: Zod schemas for plugin configuration validation

### Core Components

**FacebookFeedHashParser** (`facebook-feed-hash-parser.ts`):
- Streaming CSV parser that computes stable SHA-256 hashes for each record
- Hash includes all CSV columns and their values in order, using Unicode separators (U+241F between header/value, U+241E between fields)
- Yields records as `{ id, values, hash }` via async generator pattern
- Validates feed structure: requires headers, unique IDs, non-empty rows

**Feed Readers** (`readers/`):
- `FileFacebookFeedReader`: Reads from local filesystem
- `UrlFacebookFeedReader`: Streams from HTTP/HTTPS without buffering
- Both implement `FacebookFeedReader` interface returning `NodeJS.ReadableStream`

**TildaObjectStorage** (`storage.ts`):
- Wraps MinIO client for S3-compatible storage
- Generates date-based object keys: `{prefix}/YYYY/MM/DD/{taskId}.json`
- Uploads inventory payloads with SHA-256 checksums
- Supports path-style and virtual-hosted-style S3 addressing

**TildaImportProvider** (`provider.ts`):
- Main provider implementation with organized method groups
- Transforms Facebook feed records into `InventoryItem` format
- Handles data normalization: prices (amount in cents + currency), availability enums, category paths, tags
- Creates `InventoryUpdateTask` payloads validated against `@shopana/import-plugin-sdk` schemas
- Uploads JSON payloads to object storage before returning task metadata

### Configuration

The plugin accepts configuration with two main sections:

```typescript
{
  feed: {
    source: "url" | "file",
    url?: string,        // when source is "url"
    path?: string,       // when source is "file"
    delimiter?: string   // CSV delimiter, defaults to ";"
  },
  storage: {
    endpoint: string,    // S3-compatible endpoint URL
    accessKey: string,
    secretKey: string,
    bucket: string,
    region?: string,
    prefix?: string,     // optional object key prefix
    pathStyle?: boolean, // S3 path style vs virtual hosted
    sessionToken?: string
  }
}
```

### Data Flow

1. **Feed Ingestion**: Provider receives feed source (URL or file path)
2. **Streaming Parse**: FacebookFeedHashParser streams CSV, computes hashes per row
3. **Transformation**: Records converted to InventoryItem format with field mappings:
   - `id` → `sku`
   - `item_group_id` → `sourceId`
   - `price`/`sale_price` → parsed to `{ amount, currency }` format
   - `availability` → normalized to enum values
   - `inventory` → `quantity.available`
   - `product_type` → `categoryPath` (split by `>` or `;`)
   - `google_product_category` → `tags` (split by `,`, `>`, `;`)
4. **Payload Storage**: Array of InventoryUpdateEntry serialized to JSON, uploaded to S3
5. **Task Creation**: InventoryUpdateTask metadata returned with storage location and checksum

### Testing Patterns

Tests use Jest with ts-jest for ESM support. Key patterns:
- Test files include comments in Russian (парсит = parses)
- Use sample feed file at `src/feed-fb.csv` (not in repo, referenced in tests)
- Tests verify hash stability with expected SHA-256 values
- HTTP tests create local server to verify streaming behavior without buffering
- Always clean up resources (close servers) in finally blocks

### Dependencies

Key external dependencies:
- **csv-parse**: Streaming CSV parser with BOM handling, quote relaxation
- **minio**: S3-compatible object storage client
- **zod**: Runtime schema validation for config and data
- **@shopana/import-plugin-sdk**: Shared inventory types and validators
- **@shopana/plugin-sdk**: Core plugin contracts and types

### TypeScript Configuration

- Target: ES2022
- Module: ESNext with Node resolution
- Output: ESM with declaration files to `dist/`
- Path mappings for local SDK packages (used in both tsconfig and jest.config)
- Strict mode enabled

### Facebook Feed Format

The parser expects Facebook Product Catalog CSV format with fields:
- `id` (required): Product SKU
- `item_group_id`: Product group identifier
- `title`, `description`, `brand`: Product details
- `link`, `image_link`: URLs
- `price`, `sale_price`: Format: `{amount} {currency}` (e.g., "1299 RUB")
- `availability`: "in stock", "out of stock", "preorder", etc.
- `inventory`: Available quantity as number
- `product_type`: Category hierarchy (delimited by `>` or `;`)
- `google_product_category`: Tags (delimited by `,`, `>`, or `;`)

All fields are optional except `id`. The parser is resilient to missing or malformed data.