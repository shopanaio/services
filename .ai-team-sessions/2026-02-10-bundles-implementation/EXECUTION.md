# Execution Log: Bundles Implementation

## Problems & Solutions

### Problem 1: Repository Constructor Pattern Mismatch
**Context:** Reviewing repository examples in the plan
**Issue:** Plan showed `(db, projectId)` constructor but codebase uses `(db, txManager)` with projectId from async context
**Solution:** Repositories should use `BaseRepository` pattern: constructor takes `(db, txManager)`, projectId accessed via `this.storeId`
**Reference:** `/services/catalog/src/repositories/collection/CollectionRepository.ts`

---

### Problem 2: @Policy Decorator Usage Unclear
**Context:** Reviewing script authorization pattern
**Issue:** Plan suggests `@Policy` decorator on execute method, but existing scripts don't use it
**Solution:** Follow existing pattern - no @Policy on scripts. Authorization handled at middleware/context level, not script level.
**Reference:** `/services/catalog/src/scripts/collection/CollectionCreateScript.ts`

---

### Problem 3: DataLoader Batch Methods Missing
**Context:** DataLoader requires batch fetch by parent IDs
**Issue:** Plan shows `findByProductIds` in DataLoader but only `findByProductId` in repository
**Solution:** Add batch methods to repositories: `findByProductIds(productIds: string[]): Promise<Entity[]>`
**Reference:** `/services/catalog/src/repositories/collection/CollectionRepository.ts` (see `getByIds` pattern)

---

### Problem 4: GraphQL Query Endpoint Missing
**Context:** Phase 4 GraphQL schema review
**Issue:** Mutations defined but no queries for bundle data
**Solution:** Add to `CatalogQuery`: `bundle(productId: ID!): Bundle`, `dependencyRules(productId: ID!): [DependencyRule!]!`
**Reference:** `/services/catalog/src/api/graphql-admin/schema/base.graphql`

---
