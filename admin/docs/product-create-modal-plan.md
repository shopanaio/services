# Plan: Product Create Modal

## Goal

Create a comprehensive product creation modal with media, options, and auto-generated variants.

## Features

1. **Basic Info** - title, handle (auto-generated)
2. **Media Grid** - drag-n-drop image upload (like EditMediaModal)
3. **Options & Variants** - tag-based option input with auto-variant generation
4. **Default Status** - always DRAFT

---

## UI Layout

### Full Modal Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  ✕  New Product                                         [Create] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ General ───────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  Title                          Handle ℹ️ (Optional)         │ │
│  │  [Winter jacket_____]           [/│winter-jacket___]        │ │
│  │                                                              │ │
│  │  Description (Optional)                                      │ │
│  │  [A warm and cozy jacket________________________]           │ │
│  │  [_____________________________________________⌟]           │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Media (Optional) ──────────────────────────────────────────┐ │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │ │
│  │  │                                                       │  │ │
│  │  │              ↓  Upload images                         │  │ │
│  │  │     Drag and drop images here or click to upload.     │  │ │
│  │  │                                                       │  │ │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Variants ──────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │ 🔘 Yes, this is a product with variants                │ │ │
│  │  │    When unchecked, we will create a default variant    │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  Product options                                     [Add]  │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │ Title  [Color____]  Values [[Red ×][Green ×] |__]   × │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  Product variants (AG Grid)                                 │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │ ☑ │ ⋮⋮ │ Variant     │ Color │ Size │                 │ │ │
│  │  │───┼────┼─────────────┼───────┼──────┤                 │ │ │
│  │  │ ☑ │ ⋮⋮ │ Red / S     │ Red   │ S    │                 │ │ │
│  │  │ ☑ │ ⋮⋮ │ Red / M     │ Red   │ M    │                 │ │ │
│  │  │ ☐ │ ⋮⋮ │ Green / S   │ Green │ S    │                 │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  Tip: Variants left unchecked won't be created...           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

### Section Details

#### 1. General Section

```
┌─────────────────────────────────────────────────────────────────┐
│  General                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Title                          Handle ℹ️ (Optional)            │
│  ┌────────────────────────┐    ┌────────────────────────────┐  │
│  │ Winter jacket          │    │ / │ winter-jacket          │  │
│  └────────────────────────┘    └────────────────────────────┘  │
│                                  ↑ prefix "/"                   │
│                                                                 │
│  Description (Optional)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ A warm and cozy jacket                                   │   │
│  │                                                          │   │
│  │                                                       ⌟  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Handle Input with Prefix:
┌──────────────────────────────┐
│  /  │ winter-jacket          │   ← Input with addonBefore="/"
└──────────────────────────────┘

Tooltip on ℹ️:
"URL-friendly identifier. Auto-generated from title if left empty."
```

#### 2. Media Section

```
Empty State (Upload Zone):
┌─────────────────────────────────────────────────────────────────┐
│  Media (Optional)                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │                                                           │ │
│  │                    ↓  Upload images                       │ │
│  │       Drag and drop images here or click to upload.       │ │
│  │                                                           │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

With Images (Grid):
┌─────────────────────────────────────────────────────────────────┐
│  Media (Optional)                                    [+ Upload] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┬───────┬───────┬───────┐                     │
│  │               │       │       │       │                     │
│  │    ┌─────┐    │  IMG  │  IMG  │  IMG  │                     │
│  │    │ ★   │    │   2   │   3   │   4   │                     │
│  │    │COVER│    │       │       │       │                     │
│  │    └─────┘    ├───────┼───────┼───────┤                     │
│  │               │       │       │       │                     │
│  │   1.2 MB      │  IMG  │  IMG  │  IMG  │                     │
│  │   photo.jpg   │   5   │   6   │   7   │                     │
│  │               │       │       │       │                     │
│  └───────────────┴───────┴───────┴───────┘                     │
│                                                                 │
│  7 images                              Drag to reorder          │
└─────────────────────────────────────────────────────────────────┘

Hover State:                    Drag State:
┌───────────────┐               ┌ ─ ─ ─ ─ ─ ─ ─┐
│ ┌───────────┐ │               │               │  ┌───────────┐
│ │ 👁 ★ 🗑  │ │ ← Actions     │  Drop here   │  │   IMG 2   │
│ └───────────┘ │                               │  │  ~~~~~~   │
│     IMG 2     │               └ ─ ─ ─ ─ ─ ─ ─┘  └───────────┘
│               │                                   ↑ Dragging
└───────────────┘

Cover Badge:
┌─────────┐
│ ★ Cover │
└─────────┘
```

#### 3. Variants Section

```
┌─────────────────────────────────────────────────────────────────┐
│  Variants                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔘 Yes, this is a product with variants                 │   │
│  │     When unchecked, we will create a default variant     │   │
│  │     for you                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Product options                                        [Add]   │
│  Define the options for the product, e.g. color, size, etc.    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Title    ┌─────────────────────────────────────┐       │   │
│  │           │ Color                               │    ×  │   │
│  │           └─────────────────────────────────────┘       │   │
│  │  Values   ┌─────────────────────────────────────┐       │   │
│  │           │ [Red ×] [Green ×]  |               │       │   │
│  │           └─────────────────────────────────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Product variants                                               │
│  This ranking will affect the variants' order in your           │
│  storefront.                                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ☑ │ ⋮⋮ │ Variant        │ Color  │ Size │            │   │
│  │────┼────┼────────────────┼────────┼──────┼────────────│   │
│  │  ☑ │ ⋮⋮ │ Red / S        │ Red    │ S    │            │   │
│  │  ☑ │ ⋮⋮ │ Red / M        │ Red    │ M    │            │   │
│  │  ☐ │ ⋮⋮ │ Green / S      │ Green  │ S    │            │   │
│  │  ☑ │ ⋮⋮ │ Green / M      │ Green  │ M    │            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Tip: Variants left unchecked won't be created. You can        │
│  always create and edit variants afterwards but this list      │
│  fits the variations in your product options.                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Switch States:
┌─────────────────────────────────────────────────────────────────┐
│  (●)═══  ON   → Shows "Product options" + "Product variants"   │
│  ═══(○)  OFF  → Hides both, creates default variant on submit  │
└─────────────────────────────────────────────────────────────────┘

Option Card (labels on left):
┌─────────────────────────────────────────────────────────────────┐
│  Title    [________________________]                        ×   │
│  Values   [[Tag1 ×] [Tag2 ×]  |___]                            │
└─────────────────────────────────────────────────────────────────┘

AG Grid Columns:
┌─────────────────────────────────────────────────────────────────┐
│  Column       │ Type      │ Description                         │
│───────────────┼───────────┼─────────────────────────────────────│
│  ☑ (checkbox) │ selection │ Include/exclude variant from create │
│  ⋮⋮ (drag)    │ rowDrag   │ Reorder variants                    │
│  Variant      │ text      │ Auto-generated title "Red / S"      │
│  {Option1}    │ text      │ Dynamic column per option           │
│  {Option2}    │ text      │ Dynamic column per option           │
│  ...          │ ...       │ More option columns as needed       │
└─────────────────────────────────────────────────────────────────┘

AG Grid Features:
- rowSelection: 'multiple' with checkboxes
- rowDrag: true for reordering
- Dynamic columns generated from options
- Compact row height
- No pagination (show all variants)

With Multiple Options (cartesian product):
┌─────────────────────────────────────────────────────────────────┐
│  Options: Color [Red, Green], Size [S, M]                       │
│  ↓                                                              │
│  Grid columns: ☑ | ⋮⋮ | Variant | Color | Size                  │
│  Grid rows:    ☑ | ⋮⋮ | Red / S | Red   | S                     │
│                ☑ | ⋮⋮ | Red / M | Red   | M                     │
│                ☑ | ⋮⋮ | Green/S | Green | S                     │
│                ☑ | ⋮⋮ | Green/M | Green | M                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### State Diagrams

#### Has Variants Toggle

```
                    ☐ Unchecked                    ☑ Checked
              ┌─────────────────┐            ┌─────────────────┐
              │                 │            │                 │
              │  Options: HIDDEN│   Toggle   │  Options: SHOWN │
              │  Variants: 1    │ ────────►  │  Variants: N    │
              │  (default)      │            │  (generated)    │
              │                 │            │                 │
              └─────────────────┘            └─────────────────┘

On Submit:
  ☐ → Creates 1 default variant (no options)
  ☑ → Creates N variants from enabled checkboxes
```

#### Variant Generation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   OPTIONS   │     │  CARTESIAN  │     │  VARIANTS   │
│             │     │   PRODUCT   │     │             │
│ Color: R,B  │ ──► │             │ ──► │ R/S  R/M    │
│ Size:  S,M  │     │  2 × 2 = 4  │     │ B/S  B/M    │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘

Add Option Value:
┌─────────────┐                         ┌─────────────┐
│ Color: R,B,G│                         │ +3 variants │
│ Size:  S,M  │  ──► Recalculate ──►   │ G/S  G/M    │
└─────────────┘                         └─────────────┘

Remove Option:
┌─────────────┐                         ┌─────────────┐
│ Color: R,B  │                         │ 2 variants  │
│ (no Size)   │  ──► Recalculate ──►   │ R    B      │
└─────────────┘                         └─────────────┘
```

#### Variant Title Composition

```
Option Values:           Variant Title:
┌─────────────────┐      ┌─────────────────┐
│ Color: "Red"    │      │                 │
│ Size:  "M"      │ ──►  │   "Red / M"     │
│ Style: "Slim"   │      │                 │
└─────────────────┘      └─────────────────┘

Formula: option1.value + " / " + option2.value + " / " + ...
```

---

## Section 1: General

### Fields

| Field    | Type  | Required | Behavior                                                    |
| -------- | ----- | -------- | ----------------------------------------------------------- |
| `title`  | Input | ✅       | Focus on mount                                              |
| `handle` | Input | ❌       | Auto-gen from title (kebab-case), manual edit disables auto |

### Implementation

```tsx
const [isHandleManual, setIsHandleManual] = useState(false);
const title = watch("title");

useEffect(() => {
  if (!isHandleManual && title) {
    setValue("handle", toKebabCase(title));
  }
}, [title, isHandleManual]);
```

---

## Section 2: Media Grid

### Features

- CSS Grid: `repeat(auto-fill, minmax(100px, 1fr))`
- Cover image (first) spans 2x2
- Drag-n-drop reordering via `@dnd-kit`
- Upload via click or drag-drop
- Hover overlay with actions (delete, set as cover)
- Star badge on cover image

### Components to Reuse

From `EditMediaModal.tsx`:

- `SortableMediaItem` - grid item component
- `MediaItemOverlay` - hover actions
- DnD setup with `rectSortingStrategy`

### Simplified Version

```tsx
<MediaGrid
  items={media}
  onReorder={setMedia}
  onUpload={handleUpload}
  onDelete={handleDelete}
  onSetCover={handleSetCover}
/>
```

---

## Section 3: Options & Variants

### 3.1 Has Variants Toggle

```tsx
<Checkbox checked={hasVariants} onChange={setHasVariants}>
  This product has variants
</Checkbox>
```

When unchecked → hide options UI, create single default variant.

### 3.2 Options Input

**Option Name** - Simple text input:

```tsx
<Input
  placeholder="Option name (e.g. Color, Size)"
  value={option.name}
  onChange={(e) => updateOptionName(optionIndex, e.target.value)}
/>
```

**Option Values** - Tag-mode Select for easy multi-value input:

```tsx
<Select
  mode="tags"
  placeholder="Type and press Enter"
  tokenSeparators={[","]}
  value={option.values}
  onChange={(values) => updateOptionValues(optionIndex, values)}
/>
```

### 3.3 Variant Generation

**Algorithm:**

```typescript
function generateVariants(options: IOption[]): IGeneratedVariant[] {
  if (options.length === 0) return [];

  // Cartesian product of all option values
  const combinations = cartesianProduct(
    options.map((o) => o.values.map((v) => ({ name: o.name, value: v }))),
  );

  return combinations.map((combo, index) => ({
    id: `temp-${index}`,
    title: combo.map((c) => c.value).join(" / "), // "Red / M"
    options: combo,
    enabled: true, // checkbox state
  }));
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce((acc, arr) => acc.flatMap((x) => arr.map((y) => [...x, y])), [[]] as T[][]);
}
```

**Example:**

```
Options:
  Color: [Red, Blue]
  Size: [S, M, L]

Generated Variants (6):
  ☑ Red / S
  ☑ Red / M
  ☑ Red / L
  ☑ Blue / S
  ☑ Blue / M
  ☑ Blue / L
```

### 3.4 Variant List UI

```tsx
<div className={styles.variantList}>
  <Typography.Text type="secondary">
    Generated Variants ({enabledCount}/{variants.length}):
  </Typography.Text>

  {variants.map((variant) => (
    <div key={variant.id} className={styles.variantItem}>
      <Checkbox checked={variant.enabled} onChange={() => toggleVariant(variant.id)} />
      <span className={cx({ [styles.disabled]: !variant.enabled })}>{variant.title}</span>
    </div>
  ))}
</div>
```

### 3.5 Bulk Actions

```tsx
<Flex gap={8}>
  <Button size="small" onClick={enableAll}>
    Select All
  </Button>
  <Button size="small" onClick={disableAll}>
    Deselect All
  </Button>
</Flex>
```

---

## Data Types

```typescript
// Form state
interface ICreateProductForm {
  title: string;
  handle: string;
  media: IMediaItem[];
  hasVariants: boolean;
  options: IOption[];
  variants: IGeneratedVariant[];
}

// Option
interface IOption {
  id: string;
  name: string;
  values: string[];
}

// Generated variant
interface IGeneratedVariant {
  id: string;
  title: string; // "Red / M"
  options: IOptionValue[]; // [{ name: 'Color', value: 'Red' }, { name: 'Size', value: 'M' }]
  enabled: boolean; // checkbox state
}

interface IOptionValue {
  name: string;
  value: string;
}

// Media item
interface IMediaItem {
  id: string;
  url: string;
  name: string;
  size: number;
  isCover: boolean;
}

// Modal payload
interface IProductCreateModalPayload {
  onSuccess?: (product: { id: string; title: string }) => void;
}
```

---

## Submit Payload

```typescript
interface ICreateProductInput {
  title: string;
  handle: string;
  status: "DRAFT"; // Always draft
  media: {
    url: string;
    sortIndex: number;
    isCover: boolean;
  }[];
  options: {
    name: string;
    values: string[];
  }[];
  variants: {
    title: string;
    options: { name: string; value: string }[];
  }[];
}
```

---

## File Structure

```
admin-next/src/domains/inventory/products/modals/
└── CreateProductModal/
    ├── index.ts
    ├── CreateProductModal.tsx
    ├── CreateProductModal.styles.ts
    ├── components/
    │   ├── BasicInfoSection.tsx
    │   ├── MediaSection.tsx
    │   ├── OptionsSection.tsx
    │   └── VariantsSection.tsx
    └── utils/
        └── generateVariants.ts
```

---

## Implementation Checklist

### Backend (services/inventory)

- [ ] Check/create `ProductCreateInput` in GraphQL schema
- [ ] Create `createProduct` mutation with media, options, variants support
- [ ] Variant auto-creation from options

### Frontend (admin-next)

- [ ] Create `CreateProductModal` component
- [ ] Implement `BasicInfoSection` (title + handle)
- [ ] Implement `MediaSection` (reuse from EditMediaModal)
- [ ] Implement `OptionsSection` (tag-based selects)
- [ ] Implement `VariantsSection` (checkbox list)
- [ ] Implement `generateVariants` utility
- [ ] Register modal in `domains/modals.tsx`
- [ ] Create `useProductCreateModal` hook
- [ ] Add "Create Product" button to products list page

### Testing

- [ ] Empty title validation
- [ ] Handle uniqueness check
- [ ] Media upload/reorder
- [ ] Option add/remove/reorder
- [ ] Variant generation correctness
- [ ] Variant enable/disable
- [ ] Submit with all data combinations

---

## Edge Cases

1. **No options** → Create single default variant
2. **Options but all variants disabled** → Show error, require at least 1 enabled
3. **Duplicate option values** → Prevent/deduplicate
4. **Empty option name** → Validate required
5. **Very long variant list** → Virtual scroll if > 50 variants
6. **Handle already exists** → Show error from API

---

## Future Enhancements

1. **Price/SKU per variant** - Add inline editing in variant list
2. **Option swatches** - Color/image pickers like EditOptionsModal
3. **Duplicate from existing** - Copy product as template
4. **AI-assisted** - Generate description from title
5. **Batch media upload** - Drag multiple files at once
