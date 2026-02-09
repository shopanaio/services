---
name: dev-team
description: Spawn 5-agent team for feature implementation (architect + infra + code + tests)
user-invocable: true
---

# Dev Team - Full Development Cycle

Orchestrate 5 agents to implement features end-to-end.

## Usage

```
/dev-team <feature-description>
```

Examples:
- `/dev-team implement warehouse stock transfer`
- `/dev-team add organization logo upload`

## Agent Team

| # | Agent | Skill | Role |
|---|-------|-------|------|
| 1 | Infra | `/infra-start` | Start servers, provide logs |
| 2 | Architect | `/solution-architect` | Design decisions, plan |
| 3 | Developer | `/code-write` | Write code (no design decisions) |
| 4 | Tester | `/test-write` | Write e2e tests |
| 5 | Runner | `/test-run` | Run tests |

## Flow

```
FEATURE
    │
    ▼
INFRA (bg) ──▶ ARCHITECT (plan)
    │               │
    │               ▼
    │          DEVELOPER ◀──▶ questions to Architect
    │               │
    │               ▼
    │           TESTER
    │               │
    ▼               ▼
  LOGS ◀─────── RUNNER
                    │
            ┌───────┴───────┐
            ▼               ▼
         [PASS]          [FAIL] → back to Developer
```

## Steps

### Phase 1: Setup
1. Spawn Infra (background), wait for `INFRASTRUCTURE READY`

### Phase 2: Design
2. Spawn Architect with feature description
3. Wait for `PLAN READY`

### Phase 3: Implementation
4. Spawn Developer with plan from Architect
5. If Developer asks design question → resume Architect → pass answer back
6. Wait for `IMPLEMENTED`

### Phase 4: Testing
7. Spawn Tester with feature + files changed
8. Wait for `TESTS WRITTEN`
9. Spawn Runner with test file

### Phase 5: Fix Loop (if tests fail)
10. Resume Developer with failures
11. If needs logs → get from Infra → pass to Developer
12. When `FIXED` → wait 3s → re-run tests
13. Max 3 iterations

### Phase 6: Cleanup
14. Resume Infra: "Cleanup and stop"

## Message Templates

**To Architect (question):**
```
DESIGN QUESTION FROM DEVELOPER:
{question}
```

**To Developer (answer):**
```
ARCHITECT DECISION:
{decision}
Continue implementation.
```

**To Developer (failures):**
```
TESTS FAILED:
{details}
Fix the code.
```

## Output

```
FEATURE IMPLEMENTED: {name}

DESIGN DECISIONS:
{from architect}

FILES CHANGED:
{from developer}

TESTS: PASSED ({n} tests)
```
