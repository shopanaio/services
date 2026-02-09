---
name: code-write
description: Write and fix backend service code following architecture patterns
user-invocable: true
---

# Backend Developer Agent

Write, extend, and fix backend service code following Shopana architecture patterns.

## Usage

```
/code-write <task-description>
```

## Step 1: Understand the Task

1. **Check for plan from Architect** - Should be provided by orchestrator
2. **Follow the plan** - Don't make design decisions yourself
3. **If no plan** - Ask orchestrator to get one from Solution Architect

## Design Questions

**You do NOT make architecture/design decisions.** Ask the orchestrator:

- Which service should own this?
- Script or Saga?
- What fields to include in API?
- How to handle this edge case?
- Where should this logic live?

Format:
```
DESIGN QUESTION:
<your question>
CONTEXT: <what you're implementing>
```

Wait for `ARCHITECT DECISION` before proceeding.

## Step 2: Study Existing Patterns

Before writing, read similar code in the project:

| Layer | Location | Reference Examples |
|-------|----------|-------------------|
| GraphQL Schema | `services/<svc>/src/api/graphql-admin/schema/*.graphql` | `iam/.../organization.graphql` |
| Resolver | `services/<svc>/src/resolvers/admin/*Resolver.ts` | `iam/.../OrganizationMutationResolver.ts` |
| Script | `services/<svc>/src/scripts/<domain>/*Script.ts` | `iam/.../MemberInviteScript.ts` |
| DTO | `services/<svc>/src/scripts/<domain>/dto/*.ts` | `iam/.../dto/MemberInviteDto.ts` |
| Repository | `services/<svc>/src/repositories/*Repository.ts` | `iam/.../OrganizationRepository.ts` |

## Step 3: Implementation Order

1. **DTO** - Zod schema + params + result interfaces
2. **Repository** - Data access methods with `@Transactional`/`@ReadOnly`
3. **Script** - Business logic with `@ZodSchema`, `@Policy`, `@Transactional`
4. **GraphQL Schema** - Input type + Payload with userErrors
5. **Resolver** - Wire script to GraphQL with `@ZodResolver`
6. **Exports** - Add to `index.ts` files

## Step 4: Key Patterns

| Pattern | How |
|---------|-----|
| Error handling | Return `userErrors` array, never throw for business errors |
| Authorization | Use `@Policy` decorator with resource/action |
| Transactions | Use `@Transactional()` decorator |
| Validation | Use `@ZodSchema(schema)` decorator |
| GlobalId | Decode at resolver entry, encode at resolver exit |
| Soft delete | Set `deletedAt`, never hard delete |
| Logging | Use `this.logger`, never `console.log` |
| Imports | Always use `.js` extension |

## Step 5: After Changes

| Changed | Action |
|---------|--------|
| Service code (`services/*/src/*`) | Just save, wait 2-3s for hot-reload |
| Package code (`packages/*/src/*`) | Run `shopana build --packages` |
| GraphQL schemas (`*.graphql`) | Run `shopana schema --action build && shopana codegen` |

## Checklist

- [ ] DTO has Zod schema + types exported
- [ ] Script has all decorators + handleError method
- [ ] Repository methods have proper decorators
- [ ] GraphQL payload includes `userErrors: [UserError!]!`
- [ ] Resolver decodes/encodes GlobalIds
- [ ] All new files exported in index.ts
- [ ] No console.log (use this.logger)

## Output Format

```
IMPLEMENTED: <brief description>

FILES CHANGED:
| File | Change |
|------|--------|
| `path` | Description |

REBUILD NEEDED: Yes/No (schema/codegen commands if yes)

READY FOR TEST: /test-run tests/<service>-api/<feature>.spec.ts
```
