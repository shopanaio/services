# Task: Bundles Implementation Plan Review

**Date:** 2026-02-10
**Service:** catalog
**Pattern:** Script

## Summary

Review and verify the existing bundles implementation plan to ensure it follows codebase patterns and is ready for implementation.

## Plan Verification Status: APPROVED WITH NOTES

The implementation plan at `/Users/phl/Projects/shopana-io/services/docs/plans/bundles-implementation-plan.md` is comprehensive and follows the existing catalog service patterns. Below are the verification findings and identified gaps/corrections.

---

## Verification Findings

### 1. Database Schema (Phase 1) - VERIFIED

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| Schema location | `repositories/models/bundle.ts` | Matches `collection.ts`, `facet.ts` | OK |
| Base table pattern | pgSchema tables with indexes | Same as existing models | OK |
| Type exports | $inferSelect/$inferInsert | Same pattern throughout | OK |
| Index exports | Add to `models/index.ts` | Required, documented | OK |

**Note:** The plan references `pricingSchema` from the database-schema doc, but this should be `catalogSchema` since bundles live in catalog service. This is a documentation inconsistency - the implementation plan correctly uses catalog service paths.

### 2. Repositories (Phase 2) - VERIFIED

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| Base class | `extends BaseRepository` | Matches existing repos | OK |
| Constructor | `(db, txManager)` | Matches `CollectionRepository` | OK |
| Connection usage | `this.connection` via `txManager` | Required pattern | OK |
| Store filtering | `this.storeId` from context | Required pattern | OK |
| Folder structure | `repositories/bundle/` | Matches `collection/`, `facet/` | OK |

**Gap Identified:** The plan shows repositories extending `BaseRepository` but constructor signature should be `(db: Database, txManager: TransactionManager<Database>)` matching existing pattern. The plan shows `(db, projectId)` which is incorrect.

**Correction:** Repositories should NOT receive `projectId` in constructor - it comes from `this.storeId` (async context). Plan example code is inconsistent with documented file path references.

### 3. DataLoaders (Phase 3) - VERIFIED

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| Loader class | Separate `BundleLoader` class | Matches `CollectionLoader` | OK |
| DataLoader import | `dataloader` package | Same | OK |
| Batch loading | Map-based result grouping | Same pattern | OK |
| Integration | Add to `Loader.ts` | Required | OK |

**Gap Identified:** The plan shows adding `BundleLoader` to `Loader.ts` as `this.bundle = new BundleLoader(repository)`, but the existing pattern exposes individual loaders directly on Loader class, not nested under a namespace.

**Decision:** The plan's approach (namespaced) is cleaner for many loaders. This is acceptable as a new pattern for bundles since they have 7+ loaders.

### 4. GraphQL Schema (Phase 4) - VERIFIED

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| File location | `schema/bundle.graphql` | Matches existing | OK |
| Error type | `[GenericUserError!]!` | Required pattern | OK |
| Node interface | Implements `Node` | Same as `Collection` | OK |
| Registration | Add to `server.ts` schemaFiles | Required | OK |

**Verified:** `GenericUserError` is the correct type (defined in `relay.graphql`).

### 5. Zod Validation (Phase 5) - VERIFIED

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| Location | `resolvers/admin/validation/bundleSchemas.ts` | Matches existing | OK |
| Factory pattern | `Schema = () => z.object({...})` | Required for codegen | OK |
| Refinements | `.refine()` for cross-field validation | Same pattern | OK |

**Note:** The plan correctly uses factory functions `() => z.object({})` which is required for the codegen integration.

### 6. DTOs (Phase 6) - VERIFIED

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| Location | `scripts/bundle/dto/` | Matches existing | OK |
| Naming | `{Entity}{Action}Params/Result` | Same pattern | OK |
| UserError | `BundleResultBase` with userErrors | Same pattern | OK |
| Index file | Barrel exports | Required | OK |

### 7. Scripts (Phase 7) - VERIFIED WITH NOTES

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| Base class | `extends BaseScript` | Required | OK |
| Location | `scripts/bundle/` | Same pattern | OK |
| @Policy decorator | `@Policy({ resource: "bundle", action: "manage" })` | Same pattern | OK |
| @Transactional | For multi-entity operations | Same pattern | OK |

**Note:** The plan shows `@Policy({ resource: "bundle", action: "manage" })` but existing scripts don't have the decorator (authorization handled elsewhere). Looking at `CollectionCreateScript`, it does NOT use `@Policy` decorator. The `@Policy` decorator exists in `BaseScript.ts` imports but isn't used on scripts directly.

**Clarification Needed:** The `@Policy` decorator is available via `@shopana/shared-kernel` but the existing scripts in catalog don't use it on the `execute` method. The plan documentation may be aspirational or for a different authorization flow.

**Decision:** Follow existing pattern - scripts don't use `@Policy` decorator directly. Authorization is handled at a higher level (middleware/context).

### 8. Resolvers (Phase 8) - VERIFIED

| Aspect | Plan | Codebase Pattern | Status |
|--------|------|------------------|--------|
| Base class | `extends CatalogType` | Required | OK |
| `$preload` | Load via loader | Same as `CollectionResolver` | OK |
| ID encoding | `encodeGlobalIdByType` | Same pattern | OK |
| Mutation wiring | `@ZodResolver` decorator | Matches existing | OK |
| Script execution | `this.$ctx.kernel.runScript()` | Same pattern | OK |

**Gap Identified:** The plan mentions adding GlobalIdEntity values but doesn't show the exact enum values. These need to be added:
- `BundleGroup`
- `BundleItem`
- `BundlePricingTemplate`
- `DependencyRule`
- `ConditionGroup`
- `Condition`
- `DependencyAction`

### 9. Build (Phase 9) - VERIFIED

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `pnpm codegen` | Generate TypeScript types from GraphQL |
| 2 | `pnpm build` | Build packages |
| 3 | `pnpm db:generate` | Generate Drizzle migrations |
| 4 | `pnpm db:migrate` | Apply migrations |

---

## Identified Gaps and Corrections

### Critical Corrections

1. **Repository Constructor Pattern**
   - Plan shows: `new BundleGroupRepository(db, projectId)`
   - Should be: `new BundleGroupRepository(db, txManager)`
   - projectId comes from `this.storeId` (async context)

2. **Script @Policy Decorator**
   - Plan suggests: `@Policy({ resource: "bundle", action: "manage" })`
   - Existing pattern: No @Policy on execute method
   - Decision: Follow existing pattern, remove @Policy from plan

3. **Loader Integration Pattern**
   - Plan suggests: Namespaced `this.bundle.bundleGroup`
   - Existing: Flat `this.bundleGroup`
   - Decision: Accept namespaced pattern for bundles (cleaner with 7+ loaders)

### Missing from Plan

1. **Query Resolver Updates**
   - Need to add bundle-related queries to `CatalogQuery` type in `base.graphql`
   - Need to add query methods to `QueryResolver.ts`

2. **DependencyRules Query**
   - Should add `dependencyRules(productId: ID!): [DependencyRule!]!` query
   - Mentioned in Phase 8 but not in Phase 4 GraphQL schema

3. **Repository findByProductIds methods**
   - DataLoader uses `findByProductIds` but repository only shows `findByProductId`
   - Need batch version for DataLoader efficiency

### Minor Issues

1. **Schema location discrepancy**
   - Database doc says `pricingSchema`
   - Implementation plan correctly uses catalog service
   - Bundle tables should use `catalogSchema`

2. **Missing timestamps**
   - Some tables in plan missing `createdAt`/`updatedAt`
   - Should verify: `bundlePricingTemplate` needs timestamps

---

## Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Service | catalog | Bundles are product configuration, owned by catalog |
| Pattern | Script | Single DB operations, no post-commit side effects |
| Auth | Handled externally | Follow existing catalog pattern |
| Ordering | sortIndex (integer) | Batch reordering via drag-drop is primary use case |
| Loader namespace | bundle.* | Clean separation for 7+ related loaders |

---

## Implementation Order

1. [x] Phase 1: Database Schema (bundle.ts + migration)
2. [ ] Phase 2: Repositories (7 repos + index + Repository.ts update)
3. [ ] Phase 3: DataLoaders (BundleLoader + Loader.ts update)
4. [ ] Phase 4: GraphQL Schema (bundle.graphql + server.ts + base.graphql queries)
5. [ ] Phase 5: Zod Schemas (bundleSchemas.ts)
6. [ ] Phase 6: DTOs (15 DTO files + index)
7. [ ] Phase 7: Scripts (14 scripts + index)
8. [ ] Phase 8: Resolvers (8 resolvers + GlobalIdEntity + Mutation/Query updates)
9. [ ] Phase 9: Codegen and Build

---

## References

- Similar pattern: `/services/catalog/src/scripts/collection/` (Scripts)
- Similar pattern: `/services/catalog/src/repositories/collection/` (Repositories)
- Similar pattern: `/services/catalog/src/loaders/CollectionLoader.ts` (DataLoaders)
- Similar pattern: `/services/catalog/src/resolvers/admin/CollectionResolver.ts` (Resolvers)
- Schema pattern: `/services/catalog/src/api/graphql-admin/schema/collection.graphql`

---

## Edge Cases

1. **Cascade deletes**: FK with `onDelete: "cascade"` handles group -> items, rule -> conditions/actions
2. **Pricing template deletion**: `onDelete: "set null"` preserves items but clears template ref
3. **Reorder validation**: Verify all IDs in reorder request belong to same parent
4. **Concurrent updates**: Use optimistic locking if needed (not in current plan)

---

## VERIFICATION RESULT: PLAN READY

The implementation plan is comprehensive and follows existing codebase patterns. The identified gaps are minor and documented above. Implementation can proceed with the noted corrections.
