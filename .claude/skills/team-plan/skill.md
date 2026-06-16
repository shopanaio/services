---
name: team-plan
description: Spawn 3-agent team for planning (architect + plan-writer + plan-reviewer)
user-invocable: true
skills:
  - solution-architect
  - plan-write
  - plan-review
---

# Planning Team Orchestrator

Coordinate a 3-agent team to create high-quality implementation plans through collaborative design and review.

## Usage

```
/team-plan <feature-description>
```

Examples:
- `/team-plan implement product variant options with size and color`
- `/team-plan add bulk order status update with validation`

## Team Roster

| Agent | Skill | Model | Responsibility |
|-------|-------|-------|----------------|
| Architect | `/solution-architect` | opus | Make design decisions, choose patterns |
| Plan Writer | `/plan-write` | opus | Write detailed implementation plan |
| Plan Reviewer | `/plan-review` | opus | Review plan for completeness and issues |

## Architecture Flow

```
                    FEATURE REQUEST
                          |
                          v
                   [PREFLIGHT CHECKS]
                   git status, etc.
                          |
                          v
                    [ARCHITECT]
                  Design Decisions
                          |
                   DECISIONS READY
                          |
                          v
                   [PLAN WRITER]
                    Write Plan
                          |
                    PLAN READY
                          |
                          v
                  [PLAN REVIEWER]
                   Review Plan
                          |
              +-----------+-----------+
              v                       v
          [APPROVED]              [NEEDS REVISION]
              |                       |
              |           +-----------+
              |           v
              |    [PLAN WRITER]
              |     Revise Plan
              |           |
              |           v
              |    [PLAN REVIEWER]
              |      Re-review
              |           |
              |    (max 3 iterations)
              |           |
              v           v
            PLAN COMPLETE
                  |
                  v
           [SAVE SESSION]
```

## Agent Tracking

Maintain this table during execution:

| Agent | ID | Status | Signal |
|-------|----|--------|--------|
| Architect | {id} | spawned/context/done | CONTEXT GATHERED → DECISIONS READY |
| Plan Writer | {id} | spawned/resumed/done | PLAN READY |
| Plan Reviewer | {id} | spawned/resumed/done | APPROVED/NEEDS REVISION |

**Architect Status Flow:** spawned → gathering context → context done → making decisions → done

## Execution Protocol

### Phase 0: Preflight Checks

Before starting any agents, verify:

```bash
# 1. Check for uncommitted changes (warn if dirty)
git status --porcelain

# 2. Check if session folder already exists for this feature
ls .ai-team-sessions/ 2>/dev/null | grep "$(date +%Y-%m-%d)"
```

**If dirty working tree:** Warn user, but continue (planning doesn't modify code).

### Phase 1: Architecture & Design

**Action:** Spawn Architect agent

```
Task tool:
  subagent_type: "general-purpose"
  model: "opus"
  prompt: |
    /solution-architect

    FEATURE: {feature_description}

    ## CONTEXT GATHERING (mandatory before decisions)

    Explore the codebase to find:

    1. **Owning service** — which service owns this domain?
       Search for related entities, scripts, and schemas.

    2. **Similar implementations** — find 2-3 scripts that do similar things.
       READ them fully to understand patterns, decorators, error handling.

    3. **Data model** — read relevant DB schema files.
       Understand entities, relations, constraints.

    4. **GraphQL patterns** — check existing types, inputs, mutations.
       Note the naming conventions and payload structures.

    5. **Authorization** — how is access controlled in this domain?
       Find @Policy patterns used for similar operations.

    6. **Tests** — find related e2e tests to understand expected behavior.

    ## OUTPUT

    First output context summary:

    CONTEXT GATHERED
    - Service and why
    - Similar implementations found (with paths)
    - Relevant entities and schemas
    - GraphQL patterns to follow
    - Authorization patterns

    Then output decisions:

    DECISIONS READY
    - Service, Pattern, Authorization
    - API Contract (mutation signature)
    - Data changes
    - Reference files to follow (verified paths)
    - Edge cases from similar implementations

    RULES:
    - Do NOT make decisions without reading similar code first
    - Do NOT guess file paths — verify they exist
    - Every decision must reference gathered context
```

**Wait for:** `CONTEXT GATHERED` then `DECISIONS READY` signals

**Timeout:** 180 seconds (context gathering takes time)

**Save:**
- `gathered_context` — the context summary
- `architect_decisions` — the decisions block
- `architect_agent_id` — for potential follow-up questions

### Phase 2: Plan Writing

**Action:** Spawn Plan Writer agent

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  prompt: |
    /plan-write

    FEATURE: {feature_description}

    CONTEXT FROM ARCHITECT:
    {gathered_context}

    ARCHITECT DECISIONS:
    {architect_decisions}

    ## YOUR TASK

    Write a detailed implementation plan based on the reference files
    that Architect found.

    READ the reference files before writing — your plan must mirror
    those patterns exactly (structure, imports, decorators, error handling).

    ## REQUIRED SECTIONS

    1. DTO — schema, params, result interfaces
    2. Script/Saga — decorators, dependencies, execute logic
    3. GraphQL Schema — input, payload, mutation
    4. Resolver — method, GlobalId handling
    5. Exports — index.ts updates
    6. Build Requirements — schema/codegen/packages
    7. Edge Cases

    For each step: exact file path + what to add/change.

    Signal completion with: PLAN READY
```

**Wait for:** `PLAN READY` signal with full implementation plan

**Timeout:** 180 seconds

**Save:**
- `implementation_plan` — the full plan
- `plan_writer_agent_id` — for revisions

### Phase 3: Plan Review

**Action:** Spawn Plan Reviewer agent

```
Task tool:
  subagent_type: "general-purpose"
  model: "opus"
  prompt: |
    /plan-review

    PLAN:
    {implementation_plan}

    ARCHITECT DECISIONS:
    {architect_decisions}

    Review for: completeness, correctness, architecture alignment, edge cases.

    Output: PLAN REVIEW: APPROVED or PLAN REVIEW: NEEDS REVISION (with issues)
```

**Wait for:** Review result

**Timeout:** 60 seconds

**Save:**
- `review_result` — APPROVED or NEEDS REVISION
- `review_issues` — issues if any
- `plan_reviewer_agent_id` — for re-review

### Phase 4: Revision Loop (if needed)

**Iteration limit:** 3 attempts

**On `NEEDS REVISION`:**

1. Resume Plan Writer with issues → wait for revised `PLAN READY`
2. Resume Plan Reviewer with revised plan → check result
3. Repeat until APPROVED or max iterations reached

**If max iterations reached:** Proceed to completion with `INCOMPLETE` status.

## Output Format

### On Success (APPROVED)

```
PLANNING COMPLETE: {feature_name}

===============================================================================
DESIGN DECISIONS (from Architect)
===============================================================================

Service: {service}
Pattern: {pattern}
Authorization: {policy}
API: {mutation signature}

===============================================================================
IMPLEMENTATION PLAN (approved)
===============================================================================

{full implementation plan}

===============================================================================
REVIEW SUMMARY
===============================================================================

Status: APPROVED
Iterations: {n}
Issues addressed: {list if any revisions}

===============================================================================

READY FOR IMPLEMENTATION

To implement:
  /code-write
  ARCHITECT PLAN:
  {paste approved plan}

Or for full TDD workflow:
  /team-tdd {feature_description}

Session saved: .ai-team-sessions/{date}-{slug}/
```

### On Incomplete (max iterations reached)

```
PLANNING INCOMPLETE: {feature_name}

===============================================================================
DESIGN DECISIONS
===============================================================================

{architect_decisions}

===============================================================================
CURRENT PLAN (not approved)
===============================================================================

{latest_plan}

===============================================================================
OUTSTANDING ISSUES
===============================================================================

{remaining_issues_from_reviewer}

===============================================================================

MANUAL REVIEW REQUIRED

The plan could not be approved after 3 revision attempts.
Please review the outstanding issues before proceeding.

Options:
1. Manually adjust the plan and run /code-write
2. Provide clarification and re-run /team-plan
3. Ask architect directly: /solution-architect

Session saved: .ai-team-sessions/{date}-{slug}/
```

## Agent Communication Protocol

### Message Signals

| Signal | From | Meaning |
|--------|------|---------|
| `CONTEXT GATHERED` | Architect | Codebase exploration complete |
| `DECISIONS READY` | Architect | Design decisions complete (after context) |
| `PLAN READY` | Plan Writer | Plan written/revised |
| `PLAN REVIEW: APPROVED` | Plan Reviewer | Plan is complete and correct |
| `PLAN REVIEW: NEEDS REVISION` | Plan Reviewer | Issues found, needs fixes |
| `PLANNING COMPLETE` | Orchestrator | Success |
| `PLANNING INCOMPLETE` | Orchestrator | Max iterations reached |

### Error Handling

| Error | Action |
|-------|--------|
| Architect timeout | Retry once, then abort with partial context |
| Plan Writer timeout | Resume with simpler scope request |
| Plan Reviewer timeout | Assume APPROVED (reviewer is non-blocking) |
| Agent crash | Log error, attempt resume, escalate if fails |
| Invalid signal | Parse output manually, ask for clarification |

### Timeout Configuration

| Phase | Timeout | On Timeout |
|-------|---------|------------|
| Phase 1: Architect | 180s | Retry once (context gathering takes time) |
| Phase 2: Plan Writer | 180s | Resume with timeout warning |
| Phase 3: Plan Reviewer | 60s | Assume APPROVED |
| Phase 4: Revision | 120s per attempt | Skip to next iteration |
| Phase 5: Save Session | 30s | Continue without save |

## Session Documentation

Create session folder to store planning artifacts:

```bash
mkdir -p .ai-team-sessions/{YYYY-MM-DD}-{feature-slug}
```

Files created:
- `DECISIONS.md` — Architect's design decisions
- `PLAN.md` — Final implementation plan (approved or latest)
- `REVIEW.md` — Review feedback and iterations

## Best Practices

1. **Clear feature description** — Provide enough context for Architect to make decisions
2. **Trust the process** — Let each agent do their specialized job
3. **Don't skip review** — Even "simple" features benefit from validation
4. **Save artifacts** — Always save the plan for future reference
5. **Use approved plans** — Only implement from reviewed plans
6. **Resume when possible** — Use agent IDs to maintain context

## Integration with Other Skills

After planning is complete:

```
# For implementation with full TDD
/team-tdd {feature_description}

# For implementation only (no tests)
/code-write
ARCHITECT PLAN:
{approved_plan}

# For test creation only
/test-write
FEATURE: {feature_description}
PLAN: {approved_plan}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Architect stuck exploring | Provide more specific feature scope or service name |
| Architect can't find similar code | Suggest specific services/domains to look in |
| No CONTEXT GATHERED signal | Resume with "output your context summary now" |
| Plan too vague | Resume Plan Writer with "add more detail to step X" |
| Plan doesn't match references | Resume with "re-read {reference} and align your plan" |
| Reviewer too strict | Resume with "focus on blocking issues only" |
| Endless revision loop | After 3 attempts, proceed with manual review |
