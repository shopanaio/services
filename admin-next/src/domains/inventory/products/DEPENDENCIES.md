# ProductInfoCardA Dependencies

Migration from: `admin/src/modules/products/components/ProductInfoCardA.tsx`
Target: `admin-next/src/domains/inventory/products/`

---

## Local Components (to migrate)

### Main Component and Direct Dependencies

| File | Source Path (admin) |
|------|---------------------|
| `ProductInfoCardA.tsx` | `src/modules/products/components/` |
| `ProductInfoHeader.tsx` | `src/modules/products/components/` |
| `ProductContentTabs.tsx` | `src/modules/products/components/` |
| `PricingBlock.tsx` | `src/modules/products/components/pricing/` |
| `PriceHistory.tsx` | `src/modules/products/components/pricing/` |

### UI Components

| File | Source Path (admin) | Action |
|------|---------------------|--------|
| `Paper.tsx` | `src/components/paper/` | Rewrite with antd-style |
| `Box.tsx` | `src/components/utility/` | **REMOVE** - use `<div>` or antd `Flex` |
| `Flex.tsx` | `src/components/utility/` | **REMOVE** - use antd `Flex` |
| `utils.ts` | `src/components/utility/` | **REMOVE** (emotion utils) |
| `MediaFilePlaceholder.tsx` | `src/components/media/control/` | Rewrite with antd-style |

> **Note:** Replace all `<Box>` and custom `<Flex>` with antd `Flex` component from `antd`

### Theme Tokens

| File | Source Path (admin) | Action |
|------|---------------------|--------|
| `fonts.ts` | `src/components/theme/tokens/` | Use antd theme tokens |

---

## Entity Layer (mocks only)

> **Note:** Only create mock data/interfaces. Do not migrate entity classes.

| Interface | Description |
|-----------|-------------|
| `IProduct` | Product mock interface |
| `IProductVariant` | Variant mock interface |
| `IProductFeatureGroup` | Feature group mock interface |
| `ICategory` | Category mock interface |
| `IMediaFile` | Media file mock interface |
| `ITag` | Tag mock interface |
| `IProductGroup` | Product group mock interface |

---

## Store & Types (Drawers -> Modal Stack)

| File | Source Path (admin) | Action |
|------|---------------------|--------|
| `drawers.ts` | `src/layouts/drawers/store/` | **REWRITE** to modal stack |
| `types.ts` | `src/layouts/drawers/` | **REWRITE** to modal stack |

> **Note:** Drawers system should be replaced with modal stack pattern in admin-next

---

## Localization

> **DO NOT MIGRATE** - Use hardcoded text strings in components

- Remove `react-intl` imports
- Remove `useIntl` / `formatMessage` calls
- Replace with plain text strings

---

## Constants & Definitions

| File | Source Path (admin) |
|------|---------------------|
| `constants.tsx` | `src/defs/` |

---

## GraphQL Types

> **DO NOT MIGRATE** - Use existing types from admin-next codegen

Required types (should already exist):
- `EntityStatus`
- `EntityType`
- `DimensionUnit`
- `WeightUnit`

---

## External Dependencies (npm)

```
antd
@ant-design/icons
antd-style
react
lodash (uniqBy)
```

Changes from admin:
- `@emotion/react`, `@emotion/styled` -> `antd-style`
- `react-intl` -> removed (use plain text)

---

## Migration Notes

### Drawers -> Modal Stack
- **REWRITE REQUIRED**: Drawers system must be replaced with modal stack
- Replace `$drawers.addDrawer()` calls with modal stack API
- Replace `DrawerTypes` enum with modal stack types
- Update `handleOpenProductModal` callback in `ProductInfoCardA.tsx`

### Entity Layer
- **MOCKS ONLY**: Create mock interfaces and data
- Do not migrate entity classes (Product, Category, Tag, etc.)
- Mock interfaces should match component prop requirements

### GraphQL Types
- **DO NOT MIGRATE**: Use existing admin-next codegen types
- Import from existing graphql module

### Styling (emotion -> antd-style)
- **REWRITE REQUIRED**: Replace `@emotion/react` with `antd-style`
- Replace `css` prop with `createStyles` or inline styles
- Replace `styled` components with `createStyles`
- Example migration:
  ```tsx
  // Before (emotion)
  import { css } from '@emotion/react';
  <div css={css`color: red;`} />

  // After (antd-style)
  import { createStyles } from 'antd-style';
  const useStyles = createStyles(() => ({ root: { color: 'red' } }));
  ```

### Box & Flex Components
- **REMOVE**: Do not migrate custom `Box` and `Flex` components
- Replace `<Box>` with `<div>` or antd `<Flex>`
- Replace custom `<Flex>` with antd `<Flex>`
- Example migration:
  ```tsx
  // Before (custom)
  import { Flex } from '@components/utility/Flex';
  import { Box } from '@components/utility/Box';
  <Flex direction="column" gap="3" align="center">
    <Box px="2">content</Box>
  </Flex>

  // After (antd)
  import { Flex } from 'antd';
  <Flex vertical gap={12} align="center">
    <div style={{ padding: '0 8px' }}>content</div>
  </Flex>
  ```

### Localization
- **DO NOT MIGRATE**: No i18n needed
- Replace `formatMessage({ id: ... })` with plain text strings
- Remove all `useIntl` hooks

---

## Dependency Tree

```
ProductInfoCardA.tsx
├── ProductInfoHeader.tsx
│   ├── Paper.tsx (antd-style)
│   ├── Flex (from antd)
│   ├── IProduct (mock)
│   └── EntityStatus (existing graphql)
├── ProductContentTabs.tsx
│   ├── Paper.tsx (antd-style)
│   ├── Flex (from antd)
│   ├── IProduct (mock)
│   └── plain text (no i18n)
├── PricingBlock.tsx
│   ├── Paper.tsx (antd-style)
│   ├── Flex (from antd)
│   └── PriceHistory.tsx
├── MediaFilePlaceholder.tsx (antd-style)
├── IProduct (mock interface)
│   ├── ICategory (mock)
│   ├── IMediaFile (mock)
│   ├── ITag (mock)
│   ├── IProductVariant (mock)
│   ├── IProductFeatureGroup (mock)
│   └── IProductGroup (mock)
├── modal stack (REWRITE)
└── constants (weightUniOptions, dimensionUnitOptions)
```

**Removed (use antd equivalents):**
- `Box.tsx` → `<div>` or `<Flex>`
- `Flex.tsx` → `<Flex>` from antd
- `utils.ts` → removed (emotion utils)

---

## Migration Plan

### Step 1: Create Mock Types ✅

Create mock interfaces for product data:

```
src/domains/inventory/products/
├── mocks/
│   ├── types.ts          # IProduct, ICategory, ITag, IMediaFile, etc.
│   └── data.ts           # Mock product data for testing
```

**Tasks:**
- [x] Create `IProduct` interface with required fields
- [x] Create `IProductVariant` interface
- [x] Create `ICategory`, `ITag`, `IMediaFile` interfaces
- [x] Create `IProductFeatureGroup`, `IProductGroup` interfaces
- [x] Create mock product data for development/testing

---

### Step 2: Create Paper Component ✅

Create `Paper.tsx` wrapper using antd-style:

```
src/domains/inventory/products/
├── components/
│   └── Paper.tsx
```

**Tasks:**
- [x] Create `Paper` component with antd-style
- [x] Use antd theme tokens for styling (border-radius, background, shadow)

---

### Step 3: Create MediaFilePlaceholder Component ✅

```
src/domains/inventory/products/
├── components/
│   └── MediaFilePlaceholder.tsx
```

**Tasks:**
- [x] Create component with antd-style
- [x] Replace emotion css with createStyles

---

### Step 4: Create Constants ✅

```
src/domains/inventory/products/
├── constants.ts          # weightUnitOptions, dimensionUnitOptions
```

**Tasks:**
- [x] Copy `weightUnitOptions` from admin
- [x] Copy `dimensionUnitOptions` from admin
- [x] Import `WeightUnit`, `DimensionUnit` from local mock types

---

### Step 5: Migrate PriceHistory Component ✅

```
src/domains/inventory/products/
├── components/
│   └── pricing/
│       └── PriceHistory.tsx
```

**Tasks:**
- [x] Copy component logic
- [x] Replace `@emotion/react` css → antd-style `createStyles`
- [x] Replace custom `Flex` → antd `Flex`
- [x] Keep mock data generators (`generateMockHistory`, `getMockVariantPrices`)

---

### Step 6: Migrate PricingBlock Component ✅

```
src/domains/inventory/products/
├── components/
│   └── pricing/
│       └── PricingBlock.tsx
```

**Tasks:**
- [x] Copy component logic
- [x] Replace emotion → antd-style
- [x] Replace `Box`/`Flex` → antd `Flex` + `<div>`
- [x] Replace `Paper` import with local Paper component
- [x] Import `PriceHistory` from local

---

### Step 7: Migrate ProductInfoHeader Component ✅

```
src/domains/inventory/products/
├── components/
│   └── ProductInfoHeader.tsx
```

**Tasks:**
- [x] Copy component logic
- [x] Replace emotion → antd-style
- [x] Replace `Box`/`Flex` → antd `Flex`
- [x] Replace `formatMessage()` → plain text strings
- [x] Import `EntityStatus` from local mocks
- [x] Use `IProduct` from local mocks

---

### Step 8: Migrate ProductContentTabs Component ✅

```
src/domains/inventory/products/
├── components/
│   └── ProductContentTabs.tsx
```

**Tasks:**
- [x] Copy component logic
- [x] Replace emotion → antd-style
- [x] Replace `Flex` → antd `Flex`
- [x] Replace `formatMessage()` → plain text strings
- [x] Remove `useIntl` hook

---

### Step 9: Setup Modal Stack Integration ✅

**Tasks:**
- [x] Identify modal stack API in admin-next
- [x] Create product modal type/config
- [x] Replace `$drawers.addDrawer()` pattern with modal stack

---

### Step 10: Migrate ProductInfoCardA (Main Component)

```
src/domains/inventory/products/
├── components/
│   └── ProductInfoCardA.tsx
```

**Tasks:**
- [ ] Copy component logic
- [ ] Replace emotion → antd-style
- [ ] Replace `Box`/`Flex` → antd `Flex`
- [ ] Replace `formatMessage()` → plain text strings
- [ ] Replace drawers → modal stack
- [ ] Import all local components
- [ ] Use `IProduct` from local mocks
- [ ] Import constants from local

---

### Step 11: Final Cleanup & Testing

**Tasks:**
- [ ] Verify all imports are correct
- [ ] Test with mock data
- [ ] Check styling matches original
- [ ] Verify modal stack integration works
- [ ] Remove any unused code

---

## Final Structure

```
src/domains/inventory/products/
├── components/
│   ├── ProductInfoCardA.tsx      # Main component
│   ├── ProductInfoHeader.tsx
│   ├── ProductContentTabs.tsx
│   ├── Paper.tsx
│   ├── MediaFilePlaceholder.tsx
│   └── pricing/
│       ├── PricingBlock.tsx
│       └── PriceHistory.tsx
├── mocks/
│   ├── types.ts                  # All interfaces
│   └── data.ts                   # Mock data
├── constants.ts
└── DEPENDENCIES.md
```
