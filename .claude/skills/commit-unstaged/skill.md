---
name: commit-unstaged
description: Split unstaged changes into logical groups, stage and commit sequentially
user-invocable: true
---

# Commit Unstaged Skill

Intelligently group unstaged changes by logical categories, stage and commit them sequentially.

## Instructions

1. Run `git status` to check for unstaged files
2. If no unstaged files exist, inform the user and exit
3. Run `git diff` to see all unstaged changes
4. Analyze and group changes by logical categories:
   - Group by service/directory (e.g., all changes in `checkout/` together)
   - Group by feature/functionality when changes span multiple files
   - Group by type of change (e.g., all migrations together, all tests together)
5. For each logical group:
   - Stage files in that group: `git add <files>`
   - Generate a concise commit message using conventional commit format
   - Commit with `git commit -m "..."`
   - Show the commit hash and message
6. Continue until all groups are committed
7. Show final summary of all commits created

## Commit Message Format

```
type(scope): short description

- Detail (only if needed)
```

## Grouping Strategy

Analyze the changes to identify logical boundaries:
- **By Service**: Changes in `checkout/`, `inventory/`, `orders/` should be separate commits
- **By Feature**: Related changes across multiple files for one feature together
- **By Type**: Separate infrastructure/config from business logic
- **By Scope**: Group related changes by their functional scope

## Rules

- NEVER commit if there are no unstaged changes
- NEVER use `--no-verify` or skip hooks
- Group related changes together logically
- Keep commit messages focused on what was changed
- Do NOT add "Generated with Claude" or "Co-Authored-By" footers
- Do NOT ask for confirmation - just commit each group
- Process groups sequentially (one commit at a time)
