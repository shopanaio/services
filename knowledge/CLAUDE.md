# Shopana Project Knowledge Base

This folder contains all knowledge and documentation about the Shopana project. The content is accessible via the `shopana-knowledge` MCP server.

> Note: This CLAUDE.md was adapted from the MCP server configuration.

Use the MCP tools to search and access the project knowledge base.

**When to use shopana-knowledge MCP tools:**

- When user asks about their notes, knowledge, or documentation
- When user asks questions that might be answered in their personal notes
- When user references "my notes", "my docs", "what did I write about..."
- When user asks about decisions, how-tos, or concepts they may have documented

**Important:** Always search in English, even if the user asks in another language. The semantic search model works best with English queries.

**FORBIDDEN:** Never call `reindex` or read/write files in the `.index/` folder. The index is managed automatically by the MCP server.

**FORBIDDEN:** Never call `write` because it is deprecated. Just change files as usual.

**Available tools:**

- `mcp__shopana-knowledge__search` - semantic search across all notes (use this first, always in English)
- `mcp__shopana-knowledge__grep` - exact text/regex search for finding ALL mentions of a term
- `mcp__shopana-knowledge__explore` - traverse note links Zettelkasten-style to build context graph
- `mcp__shopana-knowledge__list` - list all notes in vault
- `mcp__shopana-knowledge__read` - read a specific note by path
- `mcp__shopana-knowledge__write` - create or update a note
- `mcp__shopana-knowledge__reindex` - rebuild the search index

**Vault folder structure:**
The `vault/` folder is the root directory for all notes. It supports organizing notes in subfolders. All `**/*.md` files are indexed recursively.

- `list` and `grep` tools accept optional `folder` parameter to filter by folder
- Example: `mcp__notes__list` with `folder: "projects"` lists only notes in `vault/projects/`

**Search strategy — when to use grep vs search:**

Use `grep` (exact text match) when:

- User says "все", "всё", "all", "every", "each", "упоминания", "mentions"
- User asks "где упоминается X", "where is X mentioned"
- Query is 1-2 words (e.g., "kubernetes", "redis cache")
- Looking for wiki-links like `[[note-name]]`
- Need to find ALL occurrences, not just relevant ones

Use `search` (semantic) when:

- User asks "что такое", "как", "почему", "what is", "how to", "why"
- User asks "про", "о", "about"
- Query is a question or phrase (3+ words)
- Looking for content RELATED to a topic, not exact matches

Examples:
| Query | Tool | Reason |
|-------|------|--------|
| "kubernetes" | grep | 1 word, likely wants all mentions |
| "найди всё про redis" | grep | "всё" = all mentions |
| "как деплоить в kubernetes" | search | question, semantic |
| "что я писал про кэширование" | search | "про" = about topic |
| "[[vitest]]" | grep | wiki-link, exact match |

**Example queries to trigger notes search:**

- "What testing framework did I choose?"
- "How do I publish to npm?"
- "What are my notes about caching?"
- "Find my notes about Docker"

**Zettelkasten approach - gathering full context:**
When researching a topic that may span multiple connected notes:

1. Search with `expandContext: true` to get linked note summaries in results
2. Use `explore` tool to traverse the knowledge graph from a starting note
3. Read specific notes with `includeRelated: true` for deeper context
4. Synthesize information from all connected notes in your answer
