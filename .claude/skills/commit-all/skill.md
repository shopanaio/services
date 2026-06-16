---
name: commit-all
description: Split unstaged changes into logical groups, stage and commit sequentially
user-invocable: true
---

# Commit All Changes Skill

Intelligently group ALL changes (staged, unstaged, tracked, untracked) by logical categories and commit them sequentially.

## Instructions

1. Run `git status` to get full picture of repository state:
   - Staged changes (ready to commit)
   - Unstaged changes (modified tracked files)
   - Untracked files (new files not yet in git)
2. If no changes exist at all, inform the user and exit
3. Gather content for analysis:
   - `git diff --cached` for staged changes
   - `git diff` for unstaged changes
   - Read content of untracked files
4. Analyze ALL changes together and group by logical content:
   - Group by feature/functionality when changes are related
   - Group by service/directory (e.g., all changes in `checkout/` together)
   - Group by type of change (e.g., all configs together, all tests together)
   - Untracked files should be grouped with related tracked changes if they belong to same feature
5. For each logical group:
   - Unstage any currently staged files not in this group: `git restore --staged <files>`
   - Stage all files for this group: `git add <files>` (works for both tracked and untracked)
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

Analyze ALL changes (regardless of git status) to identify logical boundaries by CONTENT:
- **By Feature**: Related changes across multiple files for one feature together (highest priority)
- **By Service**: Changes in `checkout/`, `inventory/`, `orders/` should be separate commits
- **By Type**: Separate infrastructure/config from business logic
- **By Scope**: Group related changes by their functional scope

**Important**: Git status (staged/unstaged/untracked) should NOT affect grouping. A new untracked file and a modified tracked file that implement the same feature should be in the SAME commit.

## Rules

- NEVER commit if there are no changes (staged, unstaged, or untracked)
- NEVER use `--no-verify` or skip hooks
- Group related changes together by content/functionality, not by git status
- Keep commit messages focused on what was changed
- Do NOT add "Generated with Claude" or "Co-Authored-By" footers
- Do NOT ask for confirmation - just commit each group
- Process groups sequentially (one commit at a time)
- Handle mixed states: a logical group may include staged + unstaged + untracked files
