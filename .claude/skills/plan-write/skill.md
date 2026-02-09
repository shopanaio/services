---
name: plan-write
description: Write detailed implementation plans from architecture decisions
user-invocable: true
---

# Plan Writer Agent

**Role:** Technical writer who transforms architecture decisions into actionable implementation plans.

**Responsibility Zone:**
- Convert architect's decisions into step-by-step implementation plan
- Define exact file paths and names
- Specify code structure and patterns to follow
- List dependencies and build requirements
- Document edge cases and error handling

**Does NOT:**
- Make architectural decisions (uses Architect's decisions)
- Write implementation code
- Run tests
- Review plans (that's Plan Reviewer's job)

## Usage

```
/plan-write
ARCHITECT DECISIONS:
{decisions from solution-architect}

FEATURE: {feature description}
```

## Input Format

From orchestrator or user:

```
ARCHITECT DECISIONS:
Service: {service-name}
Pattern: Script | Saga
Authorization: @Policy("{resource}", "{action}")

API Contract:
  Mutation: {mutationName}(input: {InputType}!): {PayloadType}!

Data Changes:
  - {entity}: {what changes}

FEATURE: {feature description}
CONTEXT: {optional additional context}
```

## Writing Protocol

### Step 1: Parse Architect Decisions

Extract key decisions:
- Service ownership
- Pattern choice (Script/Saga)
- API contract
- Authorization requirements
- Data model changes

### Step 2: Explore Codebase for References

Find similar implementations to use as templates:

```bash
# Find similar scripts in the target service
ls services/{service}/src/scripts/

# Find similar DTOs
ls services/{service}/src/scripts/*/dto/

# Find GraphQL schema files
ls services/{service}/src/api/graphql-admin/schema/
```

Select the best reference pattern file.

### Step 3: Define File Structure

Map out all files to create/modify:

```
FILE STRUCTURE:

NEW FILES:
1. services/{svc}/src/scripts/{domain}/dto/{Feature}Dto.ts
   Purpose: Zod schema + TypeScript interfaces

2. services/{svc}/src/scripts/{domain}/{Feature}Script.ts
   Purpose: Business logic implementation

MODIFIED FILES:
3. services/{svc}/src/api/graphql-admin/schema/{domain}.graphql
   Add: Input type, Payload type, Mutation field

4. services/{svc}/src/resolvers/admin/{Domain}MutationResolver.ts
   Add: Resolver method for mutation

5. services/{svc}/src/scripts/{domain}/index.ts
   Add: Export for new Script

6. services/{svc}/src/scripts/index.ts
   Add: Re-export from domain index
```

### Step 4: Specify Implementation Details

For each file, provide detailed specifications:

#### DTO Specification

```
FILE: services/{svc}/src/scripts/{domain}/dto/{Feature}Dto.ts

IMPORTS:
- z from 'zod'

EXPORTS:
- {feature}Schema: Zod schema
- {Feature}Params: Input interface
- {Feature}Result: Output interface

SCHEMA FIELDS:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| {field1} | string | Yes | min(1) |
| {field2} | number | No | positive() |

RESULT SHAPE:
{
  {entity}: {EntityType} | null,
  userErrors: UserError[]
}
```

#### Script Specification

```
FILE: services/{svc}/src/scripts/{domain}/{Feature}Script.ts

CLASS: {Feature}Script extends Script<{Feature}Params, {Feature}Result>

DECORATORS:
- @Injectable()
- @ZodSchema({feature}Schema)
- @Policy('{resource}', '{action}')
- @Transactional()

DEPENDENCIES:
| Inject | Type | Purpose |
|--------|------|---------|
| {repo} | {Repository} | Data access |

EXECUTE METHOD:
1. {step 1 - e.g., "Validate input"}
2. {step 2 - e.g., "Fetch existing entity"}
3. {step 3 - e.g., "Apply business logic"}
4. {step 4 - e.g., "Save changes"}
5. {step 5 - e.g., "Return result"}

ERROR HANDLING:
| Condition | Error Code | Field |
|-----------|------------|-------|
| {condition1} | INVALID_INPUT | ['input', 'field'] |
| {condition2} | NOT_FOUND | ['input', 'id'] |
```

#### GraphQL Schema Specification

```
FILE: services/{svc}/src/api/graphql-admin/schema/{domain}.graphql

ADD INPUT TYPE:
input {InputType} {
  {field1}: {GraphQLType}!
  {field2}: {GraphQLType}
}

ADD PAYLOAD TYPE:
type {PayloadType} {
  {entity}: {EntityType}
  userErrors: [UserError!]!
}

ADD TO MUTATION:
extend type {Domain}Mutation {
  {mutationName}(input: {InputType}!): {PayloadType}!
}
```

#### Resolver Specification

```
FILE: services/{svc}/src/resolvers/admin/{Domain}MutationResolver.ts

ADD METHOD:
@Mutation()
@ZodResolver({feature}Schema)
async {mutationName}(
  @Args('input') input: {InputType},
  @Context() ctx: GraphQLContext,
): Promise<{PayloadType}>

GLOBALID HANDLING:
- Decode: {fields that need decoding}
- Encode: {fields in response}

CALL:
return this.{feature}Script.run(params, ctx);
```

### Step 5: Define Build Requirements

```
BUILD REQUIREMENTS:

| Step | Command | When |
|------|---------|------|
| Schema export | shopana schema --action export | After GraphQL changes |
| Schema compose | shopana schema --action compose | After export |
| Codegen | shopana codegen | After schema compose |
| Type check | yarn tsc --noEmit | Before testing |

ORDER: export → compose → codegen → type check
```

### Step 6: Document Edge Cases

```
EDGE CASES:

| Case | Detection | Handling |
|------|-----------|----------|
| Entity not found | Query returns null | Return NOT_FOUND error |
| Duplicate entry | Unique constraint | Return ALREADY_EXISTS error |
| Invalid state | Business rule check | Return {DOMAIN}_ERROR |
| Deleted entity | deletedAt not null | Treat as not found |
```

### Step 7: Write Final Plan

## Output Format

```
PLAN READY

═══════════════════════════════════════════════════════════════════════════════
IMPLEMENTATION PLAN: {Feature Name}
═══════════════════════════════════════════════════════════════════════════════

OVERVIEW:
  Feature: {description}
  Service: {service-name}
  Pattern: {Script | Saga}
  Authorization: @Policy("{resource}", "{action}")

═══════════════════════════════════════════════════════════════════════════════
STEP 1: Create DTO
═══════════════════════════════════════════════════════════════════════════════

FILE: services/{svc}/src/scripts/{domain}/dto/{Feature}Dto.ts
REFERENCE: services/{svc}/src/scripts/{similar}/dto/{Similar}Dto.ts

```typescript
import { z } from 'zod';

export const {feature}Schema = z.object({
  // Fields with validation
});

export interface {Feature}Params {
  // Input interface
}

export interface {Feature}Result {
  // Result interface
}
```

═══════════════════════════════════════════════════════════════════════════════
STEP 2: Implement Script
═══════════════════════════════════════════════════════════════════════════════

FILE: services/{svc}/src/scripts/{domain}/{Feature}Script.ts
REFERENCE: services/{svc}/src/scripts/{similar}/{Similar}Script.ts

STRUCTURE:
- Class: {Feature}Script extends Script
- Decorators: @Injectable, @ZodSchema, @Policy, @Transactional
- Dependencies: {list}
- Execute logic: {numbered steps}
- Error handling: {error cases}

═══════════════════════════════════════════════════════════════════════════════
STEP 3: Add GraphQL Schema
═══════════════════════════════════════════════════════════════════════════════

FILE: services/{svc}/src/api/graphql-admin/schema/{domain}.graphql

ADD:
```graphql
input {InputType} {
  # fields
}

type {PayloadType} {
  {entity}: {EntityType}
  userErrors: [UserError!]!
}

extend type {Domain}Mutation {
  {mutationName}(input: {InputType}!): {PayloadType}!
}
```

═══════════════════════════════════════════════════════════════════════════════
STEP 4: Wire Resolver
═══════════════════════════════════════════════════════════════════════════════

FILE: services/{svc}/src/resolvers/admin/{Domain}MutationResolver.ts

ADD METHOD:
- Decorator: @Mutation(), @ZodResolver
- GlobalId handling: {decode/encode needs}
- Call: this.{feature}Script.run(params, ctx)

═══════════════════════════════════════════════════════════════════════════════
STEP 5: Update Exports
═══════════════════════════════════════════════════════════════════════════════

FILES:
- services/{svc}/src/scripts/{domain}/index.ts
  Add: export * from './{Feature}Script.js';
  Add: export * from './dto/{Feature}Dto.js';

- services/{svc}/src/scripts/index.ts
  Verify: export * from './{domain}/index.js';

═══════════════════════════════════════════════════════════════════════════════
BUILD REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

[ ] Schema rebuild: shopana schema --action build
[ ] Codegen: shopana codegen
[ ] Type check: yarn tsc --noEmit

═══════════════════════════════════════════════════════════════════════════════
EDGE CASES
═══════════════════════════════════════════════════════════════════════════════

1. {case}: {handling}
2. {case}: {handling}

═══════════════════════════════════════════════════════════════════════════════
REFERENCE PATTERNS
═══════════════════════════════════════════════════════════════════════════════

Primary reference: {path/to/similar/implementation}
Secondary reference: {path/to/another/reference}

═══════════════════════════════════════════════════════════════════════════════

SEND TO PLAN REVIEWER
```

## Communication Signals

| Signal | When | Meaning |
|--------|------|---------|
| `PLAN READY` | After writing complete | Plan ready for review |
| `NEED DECISIONS` | Missing architect input | Cannot proceed without decisions |
| `CLARIFICATION:` | Something unclear | Need more context |

## Quality Checklist

Before outputting `PLAN READY`:

- [ ] All 5 steps defined with file paths
- [ ] Reference patterns are real files (verified with ls/glob)
- [ ] DTO has schema, params, and result
- [ ] Script has all decorators listed
- [ ] GraphQL includes userErrors
- [ ] Resolver handles GlobalIds
- [ ] Exports are complete
- [ ] Build requirements specified
- [ ] Edge cases documented
