---
tags:
  - shared-graphql-guid
  - encoding
related:
  - shared-graphql-guid/index
  - shared-graphql-guid/decoding
  - shared-graphql-guid/entities
---
# Encoding

Functions for encoding UUIDs to base64 Global IDs.

## encodeGlobalIdByType

Primary function for encoding. Uses fixed namespace `shopana`.

```typescript
function encodeGlobalIdByType(id: string, type: GlobalIdType): string
```

### Usage

```typescript
import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

const globalId = encodeGlobalIdByType(uuid, GlobalIdEntity.Product);
// → "Z2lkOi8vc2hvcGFuYS9Qcm9kdWN0LzEyMy4uLg=="
```

### In Resolvers

```typescript
@SubgraphReference()
class ProductResolver extends CatalogType<string, Product> {
  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Product);
  }
}
```

### In Mappers

```typescript
function mapCheckoutToApi(checkout: CheckoutReadView) {
  return {
    id: encodeGlobalIdByType(checkout.id, GlobalIdEntity.Checkout),
    lines: checkout.lines.map(line => ({
      id: encodeGlobalIdByType(line.id, GlobalIdEntity.CheckoutLine),
      // ...
    })),
  };
}
```

### Federation References

```typescript
async avatar() {
  const imageId = await this.$get("image");
  if (!imageId) return null;

  return {
    __typename: "File" as const,
    id: encodeGlobalIdByType(imageId, GlobalIdEntity.File),
  };
}
```

## composeGlobalId

Low-level function with custom namespace.

```typescript
function composeGlobalId(
  namespace: string,
  typeName: string,
  id: string
): string
```

### Usage

```typescript
import { composeGlobalId } from "@shopana/shared-graphql-guid";

const globalId = composeGlobalId("shopana", "Product", uuid);
```

Prefer `encodeGlobalIdByType()` — it uses the correct namespace automatically.

## encodeGlobalId

Alias for `composeGlobalId()`.

```typescript
function encodeGlobalId(
  namespace: string,
  typeName: string,
  id: string
): string
```

## Related

- [[shared-graphql-guid/index]] — Package overview
- [[shared-graphql-guid/decoding]] — Decoding Global IDs back to UUIDs
- [[shared-graphql-guid/entities]] — Entity type definitions
