---
name: team-plan
description: Spawn 3-agent team for planning (architect + plan-writer + plan-reviewer)
user-invocable: true
---

# Planning Team Orchestrator

Coordinate a 3-agent team to create high-quality implementation plans through collaborative review.

## Usage

```
/team-plan <feature-description>
```

Examples:
- `/team-plan implement product variant options with size and color`
- `/team-plan add bulk order status update with validation`

## Team Roster

| Agent | Skill | Responsibility |
|-------|-------|----------------|
| Architect | `/solution-architect` | Make design decisions, choose patterns |
| Plan Writer | `/plan-write` | Write detailed implementation plan |
| Plan Reviewer | `/plan-review` | Review plan for completeness and issues |

## Architecture Flow

```
                    FEATURE REQUEST
                          │
                          ▼
                    [ARCHITECT]
                  Design Decisions
                          │
                   DECISIONS READY
                          │
                          ▼
                   [PLAN WRITER]
                   Write Plan
                          │
                    PLAN READY
                          │
                          ▼
                  [PLAN REVIEWER]
                   Review Plan
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
          [APPROVED]              [NEEDS REVISION]
              │                       │
              │           ┌───────────┘
              │           ▼
              │    [PLAN WRITER]
              │    Revise Plan
              │           │
              │           ▼
              │    [PLAN REVIEWER]
              │    Re-review
              │           │
              │    (max 2 iterations)
              │           │
              ▼           ▼
         PLAN COMPLETE
```

## Execution Protocol

### Phase 1: Architecture & Design

**Action:** Spawn Architect agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    /solution-architect

    FEATURE: {feature_description}

    Focus on design decisions only. Do NOT write implementation plan.
    Output your decisions in this format:

    DECISIONS READY

    Service: {service-name}
    Pattern: Script | Saga
    Authorization: @Policy("{resource}", "{action}")

    API Contract:
      Mutation: {mutationName}(input: {InputType}!): {PayloadType}!

    Data Changes:
      - {entity}: {what changes}

    Reference Patterns:
      - {path/to/similar/implementation}
```

**Wait for:** `DECISIONS READY` signal

**Save:** Architect decisions as `architect_decisions`

### Phase 2: Plan Writing

**Action:** Spawn Plan Writer agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    /plan-write

    ARCHITECT DECISIONS:
    {architect_decisions}

    FEATURE: {feature_description}

    Write a detailed implementation plan.
```

**Wait for:** `PLAN READY` signal with full implementation plan

**Save:** Full plan as `implementation_plan`

### Phase 3: Plan Review

**Action:** Spawn Plan Reviewer agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    /plan-review

    PLAN:
    {implementation_plan}

    Review this plan for completeness, correctness, and architecture alignment.
```

**Wait for:** Review result:
- `PLAN REVIEW: APPROVED` → Proceed to completion
- `PLAN REVIEW: NEEDS REVISION` → Proceed to revision loop

### Phase 4: Revision Loop (if needed)

**Iteration limit:** 2 revision attempts

**On `NEEDS REVISION`:**

1. Extract issues from reviewer:
   ```
   ISSUES:
   {issues_from_reviewer}
   ```

2. Resume Plan Writer:
   ```
   Task tool:
     resume: {plan_writer_agent_id}
     prompt: |
       REVISION REQUESTED

       The Plan Reviewer found issues with your plan:

       {issues_from_reviewer}

       Please revise the plan to address these issues.
       Output the complete revised plan with PLAN READY signal.
   ```

3. Wait for revised `PLAN READY`

4. Resume Plan Reviewer:
   ```
   Task tool:
     resume: {plan_reviewer_agent_id}
     prompt: |
       REVISED PLAN:

       {revised_plan}

       Re-review and confirm if issues are addressed.
   ```

5. Check result:
   - `APPROVED` → Complete
   - `NEEDS REVISION` → Repeat if iterations < 2

**If max iterations reached:**

```
PLAN REVIEW INCOMPLETE

Feature: {feature_description}
Attempts: 2/2 exhausted

REMAINING ISSUES:
{issues_from_reviewer}

CURRENT PLAN:
{latest_plan}

Manual review recommended before implementation.
```

### Phase 5: Completion

**On success:**

Output the final approved plan and save to session folder.

```
PLAN COMPLETE

FEATURE: {feature_name}

DESIGN DECISIONS:
{architect_decisions}

APPROVED PLAN:
{implementation_plan}

REVIEW STATUS: Approved by Plan Reviewer

NEXT STEPS:
1. Run /code-write with this plan
2. Or run /team-tdd for full implementation

SESSION SAVED: .ai-team-sessions/{date}-{slug}/PLAN.md
```

## Output Format

### On Success

```
PLANNING COMPLETE: {feature_name}

═══════════════════════════════════════════════════════════════════════════════
DESIGN DECISIONS (from Architect)
═══════════════════════════════════════════════════════════════════════════════

Service: {service}
Pattern: {pattern}
Authorization: {policy}
API: {mutation signature}

═══════════════════════════════════════════════════════════════════════════════
IMPLEMENTATION PLAN (approved)
═══════════════════════════════════════════════════════════════════════════════

{full implementation plan}

═══════════════════════════════════════════════════════════════════════════════
REVIEW SUMMARY
═══════════════════════════════════════════════════════════════════════════════

Status: APPROVED
Iterations: {n}
Issues addressed: {list if any revisions}

═══════════════════════════════════════════════════════════════════════════════

READY FOR IMPLEMENTATION

To implement:
  /code-write <paste plan>

Or for full TDD workflow:
  /team-tdd {feature_description}
```

### On Incomplete

```
PLANNING INCOMPLETE: {feature_name}

═══════════════════════════════════════════════════════════════════════════════
DESIGN DECISIONS
═══════════════════════════════════════════════════════════════════════════════

{architect_decisions}

═══════════════════════════════════════════════════════════════════════════════
CURRENT PLAN (not approved)
═══════════════════════════════════════════════════════════════════════════════

{latest_plan}

═══════════════════════════════════════════════════════════════════════════════
OUTSTANDING ISSUES
═══════════════════════════════════════════════════════════════════════════════

{remaining_issues_from_reviewer}

═══════════════════════════════════════════════════════════════════════════════

MANUAL REVIEW REQUIRED

The plan could not be approved after 2 revision attempts.
Please review the outstanding issues before proceeding.
```

## Agent Communication Protocol

### Message Signals

| Signal | From | Meaning |
|--------|------|---------|
| `DECISIONS READY` | Architect | Design decisions complete |
| `PLAN READY` | Plan Writer | Plan written/revised |
| `PLAN REVIEW: APPROVED` | Plan Reviewer | Plan is good |
| `PLAN REVIEW: NEEDS REVISION` | Plan Reviewer | Issues found |
| `PLANNING COMPLETE` | Orchestrator | Success |
| `PLANNING INCOMPLETE` | Orchestrator | Max iterations reached |

### Information Flow

```
Orchestrator
    │
    ├──► Architect ────► DECISIONS ────┐
    │                                  │
    ├──► Plan Writer ◄─────────────────┘
    │         │
    │         ▼
    │       PLAN
    │         │
    ├──► Plan Reviewer ◄───────────────┘
    │         │
    │    ┌────┴────┐
    │    ▼         ▼
    │ APPROVED   ISSUES ────► Plan Writer (resume)
    │    │                         │
    │    ▼                         ▼
    │ COMPLETE               REVISED PLAN ────► Plan Reviewer (resume)
```

## Session Documentation

Create session folder to store the planning artifacts:

```bash
mkdir -p .ai-team-sessions/{YYYY-MM-DD}-{feature-slug}
```

Save files:
- `DECISIONS.md` - Architect's design decisions
- `PLAN.md` - Final implementation plan (approved or latest)
- `REVIEW.md` - Review feedback and iterations

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| Max revision iterations | 2 | Attempts before giving up |
| Save session | true | Save artifacts to .ai-team-sessions |

## Best Practices

1. **Clear feature description** — Provide enough context for Architect
2. **Trust the process** — Let each agent do their job
3. **Don't skip review** — Even "simple" features benefit from review
4. **Save artifacts** — Always save the plan for future reference
5. **Use approved plans** — Only implement from approved plans

## Integration with Other Skills

After planning is complete:

```
# For implementation with full TDD
/team-tdd {feature_description}

# For implementation only (no tests)
/code-write
ARCHITECT PLAN:
{approved_plan}
```
