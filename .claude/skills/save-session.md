---
name: save-session
description: Save important session context — work done, mistakes, best practices — to .ai-sessions/
user-invocable: true
---

# Save Session Context

Save a structured summary of the current AI session to `.ai-sessions/`.

## Directory Structure

```
.ai-sessions/
  YYYY-MM-DD/
    <slug-describing-the-work>.md
```

- Create a subdirectory for today's date (`YYYY-MM-DD`)
- File name: a short kebab-case slug describing the main work done (e.g., `fix-federation-resolvers.md`)
- If the user provides a name as an argument, use it as the slug

## File Format

Generate the file with the following sections:

```markdown
# <Title describing the work>

## Session Prompt
What the user originally asked to do. Quote or paraphrase the initial request.

## Work Done
Bullet list of concrete changes made:
- Files created/modified and why
- Commands run
- Architectural decisions taken

## Mistakes & Lessons Learned
Things the AI agent did wrong or suboptimally during this session.
For each mistake:
- **What happened**: describe the error
- **Root cause**: why it happened
- **Lesson**: what to do differently next time

If no mistakes were made, write "No significant mistakes in this session."

## Best Practices Used
Patterns and approaches that worked well and should be reused:
- Specific patterns, tools, or techniques that proved effective
- Reference existing code/patterns that were followed

## Key Decisions
Important technical decisions made during the session and the reasoning behind them.

## Files Changed

| File | Change |
|------|--------|
| `path/to/file` | Brief description |

## Open Items
Anything left unfinished or that needs follow-up in a future session.
If everything is complete, write "None."
```

## Instructions

1. Review the full conversation history to gather all relevant context
2. Create the date subdirectory if it doesn't exist: `.ai-sessions/YYYY-MM-DD/`
3. Write the session file with all sections filled in honestly and specifically
4. Be brutally honest about mistakes — the whole point is to learn from them
5. Keep it concise but complete — future sessions will reference these files
6. After saving, confirm to the user with the file path
