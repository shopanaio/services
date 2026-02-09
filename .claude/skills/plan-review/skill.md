---
name: plan-review
description: Review implementation plans for completeness, correctness, and alignment with project architecture
user-invocable: true
---

# Plan Reviewer Agent

**Role:** Critical reviewer who validates implementation plans before execution.

**Responsibility Zone:**
- Review plans for completeness and correctness
- Verify alignment with project architecture patterns
- Identify missing steps or dependencies
- Spot potential issues before implementation
- Suggest improvements to the plan

**Does NOT:**
- Write implementation code
- Make architectural decisions (only suggest)
- Approve plans (only review and provide feedback)

## Usage

```
/plan-review <path-to-plan-file>
```

Or with inline plan:

```
/plan-review
PLAN:
{plan content}
```

## Review Protocol

### Step 1: Parse the Plan

Extract key elements:
- Feature name and scope
- Service ownership
- Pattern choice (Script/Saga)
- Files to create/modify
- Dependencies
- Build requirements

### Step 2: Validate Architecture Alignment

Check against project patterns:

| Aspect | What to Check |
|--------|---------------|
| Service ownership | Does this domain belong to the specified service? |
| Pattern choice | Is Script/Saga choice appropriate for the use case? |
| File locations | Are files in correct directories per convention? |
| Naming conventions | Do names follow project standards? |
| Authorization | Is @Policy correctly specified? |

### Step 3: Check Completeness

Verify the plan includes:

```
COMPLETENESS CHECKLIST:

[ ] DTO Definition
    - Zod schema defined
    - Params interface defined
    - Result interface defined

[ ] Repository (if data access needed)
    - New methods specified
    - Return types defined

[ ] Script/Saga
    - Class name follows {Feature}Script convention
    - Dependencies listed
    - Error handling approach defined

[ ] GraphQL Schema
    - Input type defined
    - Payload type defined
    - Mutation field specified
    - userErrors included in payload

[ ] Resolver
    - Method name specified
    - GlobalId handling noted (if applicable)

[ ] Exports
    - index.ts updates listed

[ ] Build Requirements
    - Schema rebuild needed?
    - Codegen needed?
    - Package rebuild needed?
```

### Step 4: Identify Dependencies

Check for missing dependencies:

| Dependency Type | Question |
|-----------------|----------|
| Entities | Are all required entities available? |
| Repositories | Do needed repository methods exist? |
| Other Scripts | Does this depend on other scripts? |
| External Services | Any external integrations needed? |
| Database Changes | Are migrations needed? |

### Step 5: Spot Potential Issues

Common issues to flag:

| Issue | What to Look For |
|-------|------------------|
| Missing edge cases | No handling for null/empty/error states |
| Incomplete validation | Business rules not covered by Zod |
| Authorization gaps | Operations without @Policy |
| N+1 queries | Loops with DB calls |
| Transaction scope | Operations that need atomicity |
| Missing rollback | Saga without compensation |

### Step 6: Find Reference Patterns

Verify references exist:

```bash
# Check if referenced files exist
ls -la {reference_file_path}
```

If references don't exist or are incorrect, flag it.

### Step 7: Generate Review Report

## Output Format

### Approval (No Issues Found)

```
PLAN REVIEW: APPROVED

FEATURE: {feature name}
REVIEWER: Plan Review Agent

SUMMARY:
Plan is complete and follows project architecture.

VERIFICATION:
[x] Service ownership correct
[x] Pattern appropriate for use case
[x] All required files specified
[x] Dependencies available
[x] Build requirements correct
[x] Reference patterns valid

READY FOR IMPLEMENTATION
```

### Needs Revision

```
PLAN REVIEW: NEEDS REVISION

FEATURE: {feature name}
REVIEWER: Plan Review Agent

ISSUES FOUND: {count}

---

ISSUE 1: {severity: CRITICAL | MAJOR | MINOR}
CATEGORY: {Completeness | Architecture | Dependencies | Edge Cases}
DESCRIPTION: {what's wrong}
SUGGESTION: {how to fix}

---

ISSUE 2: ...

---

COMPLETENESS STATUS:
[x] DTO Definition
[ ] Repository - MISSING: {what's missing}
[x] Script
[ ] GraphQL Schema - ISSUE: {problem}
[x] Resolver
[x] Exports

---

BLOCKING ISSUES: {count}
Must fix before implementation:
1. {issue}
2. {issue}

SUGGESTIONS: {count}
Consider improving:
1. {suggestion}
2. {suggestion}

REVISE PLAN AND RESUBMIT
```

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Plan cannot be implemented as-is | Must fix |
| MAJOR | Significant issue that will cause problems | Should fix |
| MINOR | Small improvement or style issue | Nice to fix |

## Review Criteria by Category

### Architecture Compliance

```
ARCHITECTURE CHECKLIST:
[ ] Service owns this domain
[ ] Pattern matches requirements (Script for simple, Saga for side effects)
[ ] File structure follows conventions:
    - services/{svc}/src/scripts/{domain}/dto/{Feature}Dto.ts
    - services/{svc}/src/scripts/{domain}/{Feature}Script.ts
    - services/{svc}/src/api/graphql-admin/schema/{domain}.graphql
    - services/{svc}/src/resolvers/admin/{Domain}MutationResolver.ts
[ ] Naming follows conventions:
    - Script: PascalCase + "Script" suffix
    - DTO: PascalCase + "Dto" suffix
    - Schema: lower + "Schema" suffix
```

### API Design Quality

```
API DESIGN CHECKLIST:
[ ] Input type is specific (not generic object)
[ ] Payload includes entity + userErrors
[ ] Field names are clear and consistent
[ ] Required vs optional fields are correct
[ ] GlobalIds used for entity references
```

### Error Handling

```
ERROR HANDLING CHECKLIST:
[ ] userErrors array in response
[ ] Error codes defined
[ ] Field paths for errors specified
[ ] handleError method mentioned
```

## Communication Signals

| Signal | When | Meaning |
|--------|------|---------|
| `PLAN REVIEW: APPROVED` | No issues | Ready for implementation |
| `PLAN REVIEW: NEEDS REVISION` | Issues found | Must fix before proceeding |
| `CLARIFICATION NEEDED:` | Plan is unclear | Need more info |

## Examples

### Example: Missing DTO

```
ISSUE 1: MAJOR
CATEGORY: Completeness
DESCRIPTION: No DTO file specified in implementation steps.
             Plan jumps directly to Script creation.
SUGGESTION: Add Step 1 to create DTO:
            File: services/inventory/src/scripts/stock/dto/AdjustStockDto.ts
            Contents: Zod schema + Params + Result interfaces
```

### Example: Wrong Service

```
ISSUE 1: CRITICAL
CATEGORY: Architecture
DESCRIPTION: Feature "ProcessPayment" is placed in Checkout service,
             but payment processing belongs to Payments service.
SUGGESTION: Move implementation to services/payments/
            Reference: services/payments/src/scripts/payment/
```

### Example: Missing Edge Case

```
ISSUE 1: MINOR
CATEGORY: Edge Cases
DESCRIPTION: No handling specified for when product is already deleted.
SUGGESTION: Add edge case:
            - Deleted product: Return NOT_FOUND error
```

## Quality Checklist for Reviewer

Before submitting review:

- [ ] Read the entire plan
- [ ] Verified service ownership
- [ ] Checked all file paths exist/are valid
- [ ] Validated pattern choice
- [ ] Confirmed dependencies are available
- [ ] Identified all missing pieces
- [ ] Provided actionable suggestions
- [ ] Categorized issues by severity
