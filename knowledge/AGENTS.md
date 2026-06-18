# Shopana Project Knowledge Base

This folder contains project knowledge and documentation for Shopana.

## How To Use

Use the local filesystem to search and read the knowledge base:

- Use `rg --files knowledge/vault` to list notes.
- Use `rg` for exact text and regex search.
- Read relevant markdown files directly before planning or changing related code.
- Prefer documents in `knowledge/vault/architecture/`, `knowledge/vault/patterns/`, and `knowledge/vault/configuration/` when they match the task.

## When To Read

Read relevant knowledge base documents when:

- creating implementation plans;
- changing architecture, module structure, GraphQL layer, generated types, configuration, or shared patterns;
- answering questions about project conventions, decisions, or documented architecture;
- the root `AGENTS.md` references knowledge base rules for the task.

## Search Strategy

Use exact search with `rg` when:

- the user asks for all mentions or exact references;
- the query is a concrete term, file name, package name, service name, or API name;
- looking for wiki-style links or headings.

Use file listing plus targeted reads when:

- the user asks about architecture or conventions;
- the task mentions a broad area like GraphQL, repositories, resolvers, federation, codegen, or configuration;
- a relevant document path is already known.

## Vault Structure

The `knowledge/vault/` folder is the root directory for notes.

Current main areas:

- `architecture/` - project architecture and decisions;
- `configuration/` - build, codegen, federation, Drizzle, and bootstrap configuration notes;
- `patterns/` - implementation patterns and module conventions;
- `packages/` - package-level notes.

## Editing Rules

- Keep knowledge base documents in markdown.
- Put reusable project rules and implementation patterns under `knowledge/vault/patterns/`.
- Put architecture decisions and system overviews under `knowledge/vault/architecture/`.
- Do not edit generated or index folders if they appear.
