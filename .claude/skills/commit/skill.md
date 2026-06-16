---
name: commit
description: Commit staged files with auto-generated commit message
user-invocable: true
---

# Commit Skill

Commit staged files with an auto-generated commit message.

## Instructions

1. Run `git status` to check for staged files
2. If no staged files exist, inform the user and exit
3. Run `git diff --cached` to see what's being committed
4. Analyze the changes and generate a concise commit message:
   - Use conventional commit format: `type(scope): description`
   - Types: feat, fix, refactor, docs, test, chore, style, perf
   - Keep the first line under 72 characters
   - Add bullet points for details only if changes are complex
5. Commit immediately with the generated message (no confirmation needed)
6. Show the commit hash and message to confirm success

## Commit Message Format

```
type(scope): short description

- Detail (only if needed)
```

## Rules

- NEVER commit if there are no staged changes
- NEVER use `--no-verify` or skip hooks
- NEVER amend commits unless explicitly asked
- Do NOT add "Generated with Claude" or "Co-Authored-By" footers
- Do NOT ask for confirmation - just commit
- IGNORE unstaged files - only focus on what's staged
