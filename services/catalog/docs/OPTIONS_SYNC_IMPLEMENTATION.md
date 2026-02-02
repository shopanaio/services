# Options Sync Implementation Guide

This document describes how to implement `OptionsSyncScript` following the same pattern as `FeaturesSyncScript`.

## Overview

The Options Sync mutation allows complete synchronization of product options in a single transactional operation. Unlike the current CRUD approach (create/update/delete), the sync pattern provides:

- **Atomic updates**: All changes succeed or fail together
- **Simplified client logic**: Send the complete desired state
- **Automatic cleanup**: Options not in the list are deleted
- **Stable IDs**: Existing options/values retain their IDs

## Current State vs Target State

### Current Implementation

```
scripts/option/
├── OptionCreateScript.ts    # Creates single option
├── OptionUpdateScript.ts    # Updates with nested CRUD for values
├── OptionDeleteScript.ts    # Deletes single option
└── dto/
    ├── OptionCreateDto.ts
    ├── OptionUpdateDto.ts
    ├── OptionDeleteDto.ts
    └── shared.ts
```

### Target Implementation

```
scripts/option/
├── OptionCreateScript.ts    # Keep for backward compatibility
├── OptionUpdateScript.ts    # Keep for backward compatibility
├── OptionDeleteScript.ts    # Keep for backward compatibility
├── OptionsSyncScript.ts     # NEW: Full sync
├── dto/
│   ├── ...existing files...
│   └── OptionSyncDto.ts     # NEW
└── validation/              # NEW
    ├── index.ts
    ├── schema.ts            # Zod structural validation
    ├── semantic.ts          # Business rules (no DB)
    └── database.ts          # DB constraints
```

## Data Model Comparison

### Features (reference)

```typescript
// Features have hierarchy (tree structure)
interface FeatureSyncItemInput {
  id?: string;           // null = create, provided = update
  index: number[];       // Tree position: [0], [1], [0,0], etc.
  isGroup: boolean;      // Groups contain children, not values
  name: string;
  values?: FeatureValueSyncInput[];
}
```

### Options (simpler, flat structure)

```typescript
// Options are flat - no hierarchy
interface OptionSyncItemInput {
  id?: string;              // null = create, provided = update
  index: number;            // Position: 0, 1, 2... (simple integer)
  slug: string;             // URL-friendly identifier
  name: string;             // Display name (translated)
  displayType: string;      // 'DROPDOWN' | 'SWATCH' | 'BUTTONS'
  values: OptionValueSyncInput[];
}

interface OptionValueSyncInput {
  id?: string;              // null = create, provided = update
  index: number;            // Position within option
  slug: string;             // URL-friendly identifier
  name: string;             // Display name (translated)
  swatch?: OptionSwatchInput | null;
}

interface OptionSwatchInput {
  swatchType: string;       // 'COLOR' | 'GRADIENT' | 'IMAGE'
  colorOne?: string;
  colorTwo?: string;
  fileId?: string;
  metadata?: unknown;
}
```

## GraphQL Schema

Add to `options.graphql`:

```graphql
# ---- Options Sync Mutation ----

"""
Input for syncing a single option value.
"""
input ProductOptionValueSyncInput {
  """Existing value ID (null = create new)."""
  id: ID

  """Position within the option (0, 1, 2...)."""
  index: Int!

  """The URL-friendly slug for the value."""
  slug: String!

  """Display name."""
  name: String!

  """The swatch for this value (null to remove)."""
  swatch: ProductOptionSwatchInput
}

"""
Input for syncing a single option.
"""
input ProductOptionSyncItemInput {
  """Existing option ID (null = create new)."""
  id: ID

  """Position in the options list (0, 1, 2...)."""
  index: Int!

  """The URL-friendly slug for the option."""
  slug: String!

  """Display name."""
  name: String!

  """The display type for UI rendering."""
  displayType: OptionDisplayType!

  """The values for this option."""
  values: [ProductOptionValueSyncInput!]!
}

"""
Input for syncing all product options.
"""
input ProductOptionsSyncInput {
  """The product to sync options for."""
  productId: ID!

  """Complete list of options (replaces existing)."""
  options: [ProductOptionSyncItemInput!]!
}

"""
Payload for options sync mutation.
"""
type ProductOptionsSyncPayload {
  """The product with updated options."""
  product: Product

  """All synced options with final IDs."""
  options: [ProductOption!]!

  """List of errors that occurred."""
  userErrors: [GenericUserError!]!
}
```

Add to `base.graphql` mutation type:

```graphql
extend type InventoryMutation {
  """
  Sync all product options. This is a complete replace operation.
  Options not in the input list will be deleted.
  """
  productOptionsSync(input: ProductOptionsSyncInput!): ProductOptionsSyncPayload!
}
```

## Implementation Details

### 1. DTO (dto/OptionSyncDto.ts)

```typescript
import type { Product, ProductOption } from "../../../repositories/models/index.js";
import type { OptionResultBase, OptionSwatchInput } from "./shared.js";

export interface OptionValueSyncInput {
  readonly id?: string;
  readonly index: number;
  readonly slug: string;
  readonly name: string;
  readonly swatch?: OptionSwatchInput | null;
}

export interface OptionSyncItemInput {
  readonly id?: string;
  readonly index: number;
  readonly slug: string;
  readonly name: string;
  readonly displayType: string;
  readonly values: OptionValueSyncInput[];
}

export interface OptionSyncParams {
  readonly productId: string;
  readonly options: OptionSyncItemInput[];
}

export interface OptionSyncResult extends OptionResultBase {
  product?: Product;
  options: ProductOption[];
}
```

### 2. Validation Schema (validation/schema.ts)

```typescript
import { z } from "zod";

const OptionSwatchInputSchema = z.object({
  swatchType: z.enum(["COLOR", "GRADIENT", "IMAGE"]),
  colorOne: z.string().optional(),
  colorTwo: z.string().optional(),
  fileId: z.string().uuid().optional(),
  metadata: z.unknown().optional(),
}).optional().nullable();

const OptionValueSyncInputSchema = z.object({
  id: z.string().uuid().optional(),
  index: z.number().int().min(0),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  swatch: OptionSwatchInputSchema,
});

const OptionSyncItemSchema = z.object({
  id: z.string().uuid().optional(),
  index: z.number().int().min(0),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  displayType: z.enum(["DROPDOWN", "SWATCH", "BUTTONS"]),
  values: z.array(OptionValueSyncInputSchema).min(1, "Option must have at least one value"),
});

export const OptionSyncInputSchema = z.object({
  productId: z.string().uuid(),
  options: z.array(OptionSyncItemSchema),
});

export type ValidatedOptionInput = z.infer<typeof OptionSyncItemSchema>;
export type ValidatedValueInput = z.infer<typeof OptionValueSyncInputSchema>;
export type ValidatedSyncInput = z.infer<typeof OptionSyncInputSchema>;
```

### 3. Semantic Validation (validation/semantic.ts)

```typescript
import type { UserError } from "../../../kernel/BaseScript.js";
import type { ValidatedOptionInput } from "./schema.js";

/**
 * Validates business rules at input level (no DB).
 */
export function validateSemantic(options: ValidatedOptionInput[]): UserError[] {
  const errors: UserError[] = [];
  const seenOptionIds = new Set<string>();
  const seenOptionSlugs = new Set<string>();
  const seenOptionIndexes = new Set<number>();
  const seenValueIds = new Set<string>();

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const path = (field: string) => ["options", String(i), field];

    // Option ID uniqueness
    if (opt.id) {
      if (seenOptionIds.has(opt.id)) {
        errors.push({
          message: `Duplicate option id "${opt.id}"`,
          field: path("id"),
          code: "DUPLICATE_ID",
        });
      } else {
        seenOptionIds.add(opt.id);
      }
    }

    // Option slug uniqueness
    if (seenOptionSlugs.has(opt.slug)) {
      errors.push({
        message: `Duplicate option slug "${opt.slug}"`,
        field: path("slug"),
        code: "DUPLICATE_SLUG",
      });
    } else {
      seenOptionSlugs.add(opt.slug);
    }

    // Option index uniqueness
    if (seenOptionIndexes.has(opt.index)) {
      errors.push({
        message: `Duplicate option index ${opt.index}`,
        field: path("index"),
        code: "DUPLICATE_INDEX",
      });
    } else {
      seenOptionIndexes.add(opt.index);
    }

    // Validate values
    const localValueSlugs = new Set<string>();
    const localValueIndexes = new Set<number>();

    for (let j = 0; j < opt.values.length; j++) {
      const val = opt.values[j];
      const valPath = (field: string) => ["options", String(i), "values", String(j), field];

      // Value ID uniqueness (global)
      if (val.id) {
        if (seenValueIds.has(val.id)) {
          errors.push({
            message: `Duplicate value id "${val.id}"`,
            field: valPath("id"),
            code: "DUPLICATE_ID",
          });
        } else {
          seenValueIds.add(val.id);
        }
      }

      // Value slug uniqueness (within option)
      if (localValueSlugs.has(val.slug)) {
        errors.push({
          message: `Duplicate value slug "${val.slug}" within option`,
          field: valPath("slug"),
          code: "DUPLICATE_SLUG",
        });
      } else {
        localValueSlugs.add(val.slug);
      }

      // Value index uniqueness (within option)
      if (localValueIndexes.has(val.index)) {
        errors.push({
          message: `Duplicate value index ${val.index} within option`,
          field: valPath("index"),
          code: "DUPLICATE_INDEX",
        });
      } else {
        localValueIndexes.add(val.index);
      }
    }
  }

  return errors;
}
```

### 4. Database Validation (validation/database.ts)

```typescript
import type { UserError } from "../../../kernel/BaseScript.js";
import type { OptionRepository } from "../../../repositories/option/OptionRepository.js";
import type { ValidatedOptionInput } from "./schema.js";

interface ExistingOption {
  id: string;
  productId: string;
}

export interface DbValidationContext {
  existingById: Map<string, ExistingOption>;
  valueIdsByOptionId: Map<string, Set<string>>;
}

/**
 * Loads data from DB for validation.
 */
export async function loadDbContext(
  repository: OptionRepository,
  productId: string,
  options: ValidatedOptionInput[]
): Promise<DbValidationContext> {
  const optionIds = options.flatMap((o) => (o.id ? [o.id] : []));
  const existing = await repository.findByIds(productId, optionIds);

  const optionIdsWithValues = options
    .filter((o) => o.id && o.values?.some((v) => v.id))
    .map((o) => o.id!);
  const valueIdMap = await repository.findValueIdsByOptionIds(optionIdsWithValues);

  return {
    existingById: new Map(existing.map((o) => [o.id, { id: o.id, productId: o.productId }])),
    valueIdsByOptionId: new Map(
      Array.from(valueIdMap.entries()).map(([k, v]) => [k, new Set(v)])
    ),
  };
}

/**
 * Validates ID ownership.
 */
export function validateDatabase(
  options: ValidatedOptionInput[],
  ctx: DbValidationContext
): UserError[] {
  const errors: UserError[] = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const path = (field: string) => ["options", String(i), field];

    if (opt.id) {
      const existing = ctx.existingById.get(opt.id);

      // ID must belong to product
      if (!existing) {
        errors.push({
          message: `Option "${opt.id}" not found in this product`,
          field: path("id"),
          code: "NOT_FOUND",
        });
        continue;
      }
    }

    // Validate value ownership
    if (opt.id && opt.values) {
      const allowedValueIds = ctx.valueIdsByOptionId.get(opt.id) ?? new Set();

      for (let j = 0; j < opt.values.length; j++) {
        const v = opt.values[j];
        if (v.id && !allowedValueIds.has(v.id)) {
          errors.push({
            message: `Value "${v.id}" does not belong to this option`,
            field: ["options", String(i), "values", String(j), "id"],
            code: "VALUE_NOT_FOUND",
          });
        }
      }
    }

    // New option cannot reference existing values
    if (!opt.id && opt.values?.some((v) => v.id)) {
      errors.push({
        message: "New option cannot reference existing value IDs",
        field: path("values"),
        code: "INVALID_VALUE_REFERENCE",
      });
    }
  }

  return errors;
}
```

### 5. Main Script (OptionsSyncScript.ts)

```typescript
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { OptionSyncParams, OptionSyncResult, OptionValueSyncInput, OptionSwatchInput } from "./dto/index.js";
import {
  OptionSyncInputSchema,
  type ValidatedOptionInput,
  validateSemantic,
  loadDbContext,
  validateDatabase,
} from "./validation/index.js";

interface ResolvedOption {
  readonly input: ValidatedOptionInput;
  readonly id: string;
}

export class OptionsSyncScript extends BaseScript<OptionSyncParams, OptionSyncResult> {
  @Transactional()
  protected async execute(params: OptionSyncParams): Promise<OptionSyncResult> {
    // ═══════════════════════════════════════════════════════════════════════
    // Layer 1: Structural validation (Zod)
    // ═══════════════════════════════════════════════════════════════════════
    const parseResult = OptionSyncInputSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        product: undefined,
        options: [],
        userErrors: parseResult.error.issues.map((issue) => ({
          message: issue.message,
          field: issue.path.map(String),
          code: "VALIDATION_ERROR",
        })),
      };
    }
    const { productId, options } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════════════
    // Product existence check
    // ═══════════════════════════════════════════════════════════════════════
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Layer 2: Semantic validation (sync, no DB)
    // ═══════════════════════════════════════════════════════════════════════
    const semanticErrors = validateSemantic(options);
    if (semanticErrors.length > 0) {
      return { product: undefined, options: [], userErrors: semanticErrors };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Layer 3: Database validation (async, batch queries)
    // ═══════════════════════════════════════════════════════════════════════
    const dbCtx = await loadDbContext(this.repository.option, productId, options);
    const dbErrors = validateDatabase(options, dbCtx);
    if (dbErrors.length > 0) {
      return { product: undefined, options: [], userErrors: dbErrors };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Sync: Delete -> Create -> Update
    // ═══════════════════════════════════════════════════════════════════════
    const keepIds = options.flatMap((o) => (o.id ? [o.id] : []));
    await this.repository.option.deleteExcept(productId, keepIds);

    const resolved = await this.resolveOptions(productId, options);

    for (const item of resolved) {
      await this.upsertOption(item);
      await this.syncValues(item.id, item.input.values);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Return result
    // ═══════════════════════════════════════════════════════════════════════
    const [product, syncedOptions] = await Promise.all([
      this.repository.product.findById(productId),
      this.repository.option.findByProductId(productId),
    ]);

    this.logger.info(
      { productId, optionCount: syncedOptions.length },
      "Product options synced"
    );

    return { product: product ?? undefined, options: syncedOptions, userErrors: [] };
  }

  private async resolveOptions(
    productId: string,
    options: ValidatedOptionInput[]
  ): Promise<ResolvedOption[]> {
    const resolved: ResolvedOption[] = [];

    for (const opt of options) {
      let id: string;

      if (opt.id) {
        id = opt.id;
      } else {
        const created = await this.repository.option.create(productId, {
          slug: opt.slug,
          displayType: opt.displayType,
        });
        id = created.id;
      }

      resolved.push({ input: opt, id });
    }

    return resolved;
  }

  private async upsertOption(item: ResolvedOption): Promise<void> {
    await this.repository.option.update(item.id, {
      slug: item.input.slug,
      displayType: item.input.displayType,
    });

    await this.repository.translation.upsertOptionTranslation({
      projectId: this.getProjectId(),
      optionId: item.id,
      locale: this.getLocale(),
      name: item.input.name,
    });
  }

  private async syncValues(optionId: string, values: OptionValueSyncInput[]): Promise<void> {
    const keepIds = values.flatMap((v) => (v.id ? [v.id] : []));
    await this.repository.option.deleteValuesExcept(optionId, keepIds);

    const sorted = [...values].sort((a, b) => a.index - b.index);

    for (const value of sorted) {
      let valueId: string;
      let swatchId: string | null = null;

      // Handle swatch
      if (value.swatch) {
        swatchId = await this.createSwatch(value.swatch);
      }

      if (value.id) {
        await this.repository.option.updateValue(value.id, {
          slug: value.slug,
          sortIndex: value.index,
          swatchId: value.swatch === null ? null : swatchId,
        });
        valueId = value.id;
      } else {
        const created = await this.repository.option.createValue(optionId, {
          slug: value.slug,
          sortIndex: value.index,
          swatchId,
        });
        valueId = created.id;
      }

      await this.repository.translation.upsertOptionValueTranslation({
        projectId: this.getProjectId(),
        optionValueId: valueId,
        locale: this.getLocale(),
        name: value.name,
      });
    }
  }

  private async createSwatch(swatch: OptionSwatchInput): Promise<string> {
    const created = await this.repository.option.createSwatch({
      swatchType: swatch.swatchType,
      colorOne: swatch.colorOne ?? null,
      colorTwo: swatch.colorTwo ?? null,
      imageId: swatch.fileId ?? null,
      metadata: swatch.metadata ?? null,
    });
    return created.id;
  }

  private error(message: string, field: string[], code: string): OptionSyncResult {
    return { product: undefined, options: [], userErrors: [{ message, field, code }] };
  }

  protected handleError(_error: unknown): OptionSyncResult {
    return this.error("Internal error", [], "INTERNAL_ERROR");
  }
}
```

### 6. Resolver (MutationResolver.ts)

Add to the resolver:

```typescript
import { OptionsSyncScript } from "../../scripts/option/OptionsSyncScript.js";

// In the resolver class:
async productOptionsSync(args: { input: ProductOptionsSyncInput }) {
  const { input } = args;

  const result = await this.$ctx.kernel.runScript(OptionsSyncScript, {
    productId: input.productId,
    options: input.options.map((option) => ({
      id: option.id ?? undefined,
      index: option.index,
      slug: option.slug,
      name: option.name,
      displayType: option.displayType,
      values: option.values.map((value) => ({
        id: value.id ?? undefined,
        index: value.index,
        slug: value.slug,
        name: value.name,
        swatch: value.swatch ?? undefined,
      })),
    })),
  });

  return {
    product: result.product ? new ProductResolver(this.$ctx, result.product) : null,
    options: result.options.map((o) => new OptionResolver(this.$ctx, o)),
    userErrors: result.userErrors,
  };
}
```

## UI Integration

The `edit-options-modal` UI component (`admin-next/src/domains/inventory/products/modals/edit-options-modal`) should be updated to call the sync mutation instead of individual CRUD operations.

### Form Data Transformation

```typescript
// Transform form data to sync input
function transformFormToSyncInput(
  productId: string,
  groups: ApiProductOption[]
): ProductOptionsSyncInput {
  return {
    productId,
    options: groups.map((group, index) => ({
      // Use existing ID if it's a real UUID, otherwise null for new
      id: isRealId(group.id) ? group.id : null,
      index,
      slug: group.slug,
      name: group.name,
      displayType: group.displayType,
      values: group.values.map((value, valueIndex) => ({
        id: isRealId(value.id) ? value.id : null,
        index: valueIndex,
        slug: value.slug,
        name: value.name,
        swatch: value.swatch ? {
          swatchType: value.swatch.swatchType,
          colorOne: value.swatch.colorOne,
          colorTwo: value.swatch.colorTwo,
          fileId: value.swatch.file?.id,
          metadata: value.swatch.metadata,
        } : null,
      })),
    })),
  };
}

// Helper to check if ID is from the database
function isRealId(id: string): boolean {
  // Temporary IDs start with 'opt-' or 'val-' (from Date.now())
  return !id.startsWith('opt-') && !id.startsWith('val-') && !id.startsWith('swatch-');
}
```

### GraphQL Mutation

```graphql
mutation ProductOptionsSync($input: ProductOptionsSyncInput!) {
  inventory {
    productOptionsSync(input: $input) {
      product {
        id
      }
      options {
        id
        slug
        name
        displayType
        values {
          id
          slug
          name
          swatch {
            id
            swatchType
            colorOne
            colorTwo
            file {
              id
              url
            }
          }
        }
      }
      userErrors {
        message
        field
        code
      }
    }
  }
}
```

## Repository Methods to Add

Add these methods to `OptionRepository`:

```typescript
/**
 * Delete all options except those with given IDs
 */
async deleteExcept(productId: string, keepIds: string[]): Promise<void>;

/**
 * Find options by IDs for a product
 */
async findByIds(productId: string, ids: string[]): Promise<ProductOption[]>;

/**
 * Get value IDs grouped by option ID
 */
async findValueIdsByOptionIds(optionIds: string[]): Promise<Map<string, string[]>>;

/**
 * Delete all values except those with given IDs
 */
async deleteValuesExcept(optionId: string, keepIds: string[]): Promise<void>;
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Zod structural validation failed |
| `NOT_FOUND` | Product or referenced option not found |
| `DUPLICATE_ID` | Same ID appears multiple times |
| `DUPLICATE_SLUG` | Same slug appears multiple times |
| `DUPLICATE_INDEX` | Same index appears multiple times |
| `VALUE_NOT_FOUND` | Value doesn't belong to the option |
| `INVALID_VALUE_REFERENCE` | New option references existing value ID |
| `INTERNAL_ERROR` | Unexpected server error |

## Example Usage

### Create new options

```typescript
await syncOptions(api, productId, [
  {
    index: 0,
    slug: "size",
    name: "Size",
    displayType: "BUTTONS",
    values: [
      { index: 0, slug: "s", name: "Small" },
      { index: 1, slug: "m", name: "Medium" },
      { index: 2, slug: "l", name: "Large" },
    ],
  },
  {
    index: 1,
    slug: "color",
    name: "Color",
    displayType: "SWATCH",
    values: [
      {
        index: 0,
        slug: "red",
        name: "Red",
        swatch: { swatchType: "COLOR", colorOne: "#FF0000" },
      },
      {
        index: 1,
        slug: "blue",
        name: "Blue",
        swatch: { swatchType: "COLOR", colorOne: "#0000FF" },
      },
    ],
  },
]);
```

### Update existing options

```typescript
await syncOptions(api, productId, [
  {
    id: existingOptionId,  // Keep the same ID
    index: 0,
    slug: "size",
    name: "Updated Size",
    displayType: "DROPDOWN",  // Changed display type
    values: [
      { id: existingValueId, index: 0, slug: "xs", name: "Extra Small" },
      { index: 1, slug: "s", name: "Small" },  // New value
    ],
  },
]);
```

### Clear all options

```typescript
await syncOptions(api, productId, []);
```

## Variant References Preservation

**IMPORTANT**: Variants reference options through `selectedOptions` (optionId + optionValueId). The sync MUST preserve these references for existing options/values.

### ID Stability Rules

1. **Existing option IDs are NEVER changed** — when `id` is provided in input, the option keeps its exact ID
2. **Existing value IDs are NEVER changed** — when `id` is provided for a value, it keeps its exact ID
3. **Only new items get new IDs** — items without `id` in input are created with new UUIDs
4. **Deleted options/values** — variants referencing deleted options/values will have orphaned references

This ensures that variants continue to correctly reference their options after sync:

```typescript
// Variant before sync:
{ selectedOptions: [{ optionId: "abc-123", optionValueId: "def-456" }] }

// After sync (option "abc-123" updated but ID preserved):
{ selectedOptions: [{ optionId: "abc-123", optionValueId: "def-456" }] }  // Still valid!
```

### What happens to variants:

| Action | Variant Impact |
|--------|----------------|
| Update option name/slug/displayType | No impact — ID unchanged |
| Update value name/slug/swatch | No impact — ID unchanged |
| Reorder options/values | No impact — IDs unchanged |
| Add new option | No impact — existing variants unchanged |
| Add new value | No impact — existing variants unchanged |
| Delete option with `id` | Variants with this optionId become orphaned |
| Delete value with `id` | Variants with this optionValueId become orphaned |

### Deletion behavior

Options and values CAN be deleted even if variants reference them. The variant's `selectedOptions` will contain orphaned references (optionId/optionValueId that no longer exist). This is acceptable — the UI should handle missing option references gracefully.

## Key Differences from Features

| Aspect | Features | Options |
|--------|----------|---------|
| Hierarchy | Tree structure (`index: [0, 1]`) | Flat (`index: number`) |
| Grouping | Groups contain children | No grouping |
| Values | Optional for non-groups | Required (min 1) |
| Slug | No slug | Required for options and values |
| Display Type | No | `DROPDOWN`, `SWATCH`, `BUTTONS` |
| Swatch | No | Optional per value |

## Implementation Checklist

- [ ] Create `dto/OptionSyncDto.ts`
- [ ] Create `validation/schema.ts`
- [ ] Create `validation/semantic.ts`
- [ ] Create `validation/database.ts`
- [ ] Create `validation/index.ts`
- [ ] Create `OptionsSyncScript.ts`
- [ ] Add repository methods to `OptionRepository`
- [ ] Update GraphQL schema (`options.graphql`)
- [ ] Add resolver method
- [ ] Export in `scripts/index.ts`
- [ ] Write e2e tests
- [ ] Update UI to use sync mutation
