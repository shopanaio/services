# Notes MCP

Local MCP server for granular semantic search over atomic markdown notes.

## Design Principles

1. **Atomic notes** — one concept per file (50-200 words)
2. **Granular search** — index by sections, not whole files
3. **Minimal context** — Claude gets only relevant chunks
4. **Local-first** — no external APIs, everything runs on your machine

## Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| MCP | @modelcontextprotocol/sdk | Protocol for Claude communication |
| Embeddings | Ollama + nomic-embed-text | Local vectors, ~5ms/request |
| Index | Vectra | Vector search in JSON, no database |
| Watcher | chokidar | File change detection |
| Parser | gray-matter + custom | Frontmatter, tags, links, sections |

## Architecture

```
┌─────────────┐     stdio      ┌─────────────┐
│   Claude    │ ◄────────────► │  MCP Server │
└─────────────┘                └──────┬──────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
              ┌──────────┐     ┌──────────┐     ┌──────────┐
              │  Tools   │     │ Indexer  │     │ Watcher  │
              └────┬─────┘     └────┬─────┘     └────┬─────┘
                   │                │                │
                   │                ▼                │
                   │         ┌──────────┐           │
                   │         │  Ollama  │           │
                   │         │ (embed)  │           │
                   │         └────┬─────┘           │
                   │              │                 │
                   ▼              ▼                 ▼
              ┌─────────────────────────────────────────┐
              │              File System                │
              │  vault/                                 │
              │  ├── concepts/*.md   (atomic notes)    │
              │  ├── decisions/*.md  (ADRs)            │
              │  ├── services/*.md   (service docs)    │
              │  └── .index/         (Vectra JSON)     │
              └─────────────────────────────────────────┘
```

## Vault Structure

```
vault/
├── concepts/              # Core concepts (one idea = one file)
│   ├── auth-jwt.md
│   ├── auth-session.md
│   ├── auth-oauth.md
│   └── graphql-federation.md
├── decisions/             # Architecture Decision Records
│   ├── adr-001-auth-method.md
│   └── adr-002-database.md
├── services/              # Service documentation
│   ├── checkout.md
│   ├── inventory.md
│   └── iam.md
├── how-to/                # Step-by-step guides
│   ├── add-graphql-field.md
│   └── run-migrations.md
└── .index/                # Generated index (gitignore)
    └── index.json
```

## Note Template

Each note should be atomic (50-200 words) and self-contained:

```markdown
---
tags: [auth, jwt, security]
related: [auth-session, auth-oauth]
---

# JWT Authentication

Short description of what this is.

## How it works

1. Step one
2. Step two
3. Step three

## Where used

- Service A uses this for X
- Service B uses this for Y

## Code references

- Implementation: `services/iam/src/jwt.ts`
- Config: `services/iam/src/config.ts`

## See also

- [[auth-session]] — alternative approach
- [[auth-oauth]] — for external providers
```

## Project Structure

```
packages/notes-mcp/
├── src/
│   ├── index.ts              # Entry point, MCP server
│   ├── config.ts             # Configuration (paths, model)
│   ├── tools/
│   │   ├── index.ts          # Tool registration
│   │   ├── search.ts         # Semantic search (returns chunks)
│   │   ├── read.ts           # Read note or section
│   │   ├── write.ts          # Create/update note
│   │   ├── list.ts           # List notes with filters
│   │   └── reindex.ts        # Force reindex
│   ├── indexer/
│   │   ├── index.ts          # Main Indexer class
│   │   ├── chunker.ts        # Split notes into sections
│   │   ├── embeddings.ts     # Ollama client
│   │   ├── parser.ts         # Markdown parser (tags, links)
│   │   └── watcher.ts        # File watcher
│   └── types.ts              # Type definitions
├── package.json
└── tsconfig.json
```

## MCP Tools

### search
Semantic search — returns relevant chunks, not whole files.

```typescript
{
  name: "search",
  description: "Find relevant note sections by meaning",
  inputSchema: {
    query: string,        // Search query
    limit?: number,       // Max results (default: 5)
    threshold?: number,   // Min relevance 0-1 (default: 0.7)
    tags?: string[]       // Filter by tags
  },
  returns: {
    results: [{
      path: string,       // "concepts/auth-jwt.md"
      section: string,    // "How it works" (null if whole note)
      score: number,      // 0.89
      content: string     // The actual text chunk
    }]
  }
}
```

### read
Read note or specific section.

```typescript
{
  name: "read",
  description: "Read note contents",
  inputSchema: {
    path: string,           // File path
    section?: string,       // Specific section (e.g., "How it works")
    includeRelated?: bool   // Include linked notes (default: false)
  }
}
```

### write
Create or update note with template structure.

```typescript
{
  name: "write",
  description: "Create or update note",
  inputSchema: {
    path: string,       // File path
    content: string,    // Markdown content
    tags?: string[],    // Tags for frontmatter
    related?: string[]  // Related notes
  }
}
```

### list
List notes with filtering.

```typescript
{
  name: "list",
  description: "List notes",
  inputSchema: {
    folder?: string,    // Folder (default: all)
    tags?: string[],    // Filter by tags
    limit?: number      // Max results
  }
}
```

### reindex
Full vault reindex.

```typescript
{
  name: "reindex",
  description: "Rebuild index",
  inputSchema: {}
}
```

## Indexer

### Chunking Strategy

Notes are split into chunks by H2 sections:

```markdown
# JWT Authentication      → chunk 0 (intro)

## How it works           → chunk 1
Content here...

## Where used             → chunk 2
Content here...
```

Each chunk is indexed separately with its own embedding.

### Index Structure (Vectra)

```typescript
interface IndexItem {
  id: string                // hash of path + section
  vector: number[]          // embedding [768]
  metadata: {
    path: string            // "concepts/auth-jwt.md"
    section: string | null  // "How it works" or null for intro
    title: string           // Note title
    tags: string[]          // From frontmatter and #tags
    links: string[]         // [[wikilinks]] in this chunk
    modified: number        // File modification timestamp
    contentHash: string     // Hash of chunk content
    content: string         // Actual text (for returning in search)
  }
}
```

### Indexing Logic

```
1. Scan vault/**/*.md
2. For each file:
   a. Parse frontmatter (tags, related)
   b. Split into chunks by ## headings
   c. For each chunk:
      i.   Compute contentHash
      ii.  If hash unchanged — skip
      iii. Send to Ollama → get embedding
      iv.  Upsert to Vectra index
3. Remove deleted files/chunks from index
```

### Incremental Updates

```
File Watcher (chokidar)
    │
    ├── add/change → re-chunk and reindex file
    └── unlink → remove all chunks from index
```

## Configuration

```typescript
// config.ts
export const config = {
  vaultPath: process.env.VAULT_PATH || './vault',
  indexPath: '.index',
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'nomic-embed-text'
  },
  chunking: {
    splitOn: '## ',           // Split on H2 headings
    minChunkSize: 50,         // Min words per chunk
    maxChunkSize: 500,        // Max words per chunk
    includeIntro: true        // Index content before first H2
  },
  search: {
    defaultLimit: 5,
    defaultThreshold: 0.7
  }
}
```

## Development Phases

### 1. Basic MCP Server
- [ ] Project initialization (package.json, tsconfig)
- [ ] MCP server with stdio transport
- [ ] Tool stubs

### 2. File Operations
- [ ] read tool — read markdown
- [ ] write tool — write with frontmatter
- [ ] list tool — glob over vault
- [ ] parser — extract tags, links

### 3. Chunker
- [ ] Split markdown by H2 sections
- [ ] Extract section titles
- [ ] Handle edge cases (no H2, empty sections)

### 4. Ollama Client
- [ ] HTTP client for /api/embeddings
- [ ] Error handling (Ollama not running)
- [ ] Retry logic

### 5. Vectra Index
- [ ] Index initialization
- [ ] Add/update chunks
- [ ] Vector search
- [ ] Delete chunks

### 6. Full Indexing
- [ ] Vault scanning
- [ ] Batch chunk indexing
- [ ] reindex tool

### 7. Semantic Search
- [ ] search tool with chunk results
- [ ] Threshold filtering
- [ ] Tag filtering
- [ ] Return path + section + score + content

### 8. File Watcher
- [ ] chokidar setup
- [ ] Incremental updates per chunk
- [ ] Debounce for frequent changes

### 9. Polish
- [ ] Graceful shutdown
- [ ] Logging
- [ ] Input validation
- [ ] README with instructions

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0",
    "vectra": "^0.9",
    "chokidar": "^3.5",
    "glob": "^10.0",
    "gray-matter": "^4.0"
  },
  "devDependencies": {
    "typescript": "^5.0",
    "@types/node": "^20.0"
  }
}
```

## Requirements

- Node.js 18+
- Ollama with model:
  ```bash
  ollama pull nomic-embed-text
  ```

## Claude Code Setup

```json
// ~/.config/claude/claude_desktop_config.json
{
  "mcpServers": {
    "notes": {
      "command": "node",
      "args": ["/path/to/notes-mcp/dist/index.js"],
      "env": {
        "VAULT_PATH": "/path/to/vault"
      }
    }
  }
}
```

## Usage Example

```
User: "How does authentication work?"

Claude calls: search({ query: "authentication" })

Returns:
  - concepts/auth-jwt.md#how-it-works (score: 0.92)
  - concepts/auth-session.md#how-it-works (score: 0.87)
  - services/iam.md#authentication (score: 0.81)

Claude reads only the relevant chunks, not entire files.
```
