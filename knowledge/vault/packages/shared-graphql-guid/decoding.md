---
tags:
  - shared-graphql-guid
  - decoding
related:
  - shared-graphql-guid/index
  - shared-graphql-guid/encoding
  - shared-graphql-guid/entities
  - shared-graphql-guid/validators
---
# Decoding

Functions for decoding base64 Global IDs to UUIDs.

## decodeGlobalIdByType

Primary function for decoding with optional type validation.

```typescript
function decodeGlobalIdByType(
  globalId: string,
  expectedType?: GlobalIdType
): string
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `globalId` | `string` | Base64-encoded Global ID |
| `expectedType` | `GlobalIdType?` | Expected entity type (optional) |

### Returns

Raw UUID string.

### Throws

- Base64 decoding fails
- Invalid format
- Type mismatch (if `expectedType` provided)
- Wrong namespace

### Usage

```typescript
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

// With type validation
const uuid = decodeGlobalIdByType(globalId, GlobalIdEntity.Checkout);

// Without validation (any type)
const uuid = decodeGlobalIdByType(globalId);
```

### In Federation References

```typescript
const typeResolvers = {
  Variant: {
    __resolveReference: async (ref, ctx) => {
      const variantId = decodeGlobalIdByType(ref.id, GlobalIdEntity.Variant);
      return VariantResolver.load(variantId, ctx);
    },
  },
};
```

## parseGlobalId

Decodes to full `GlobalId` object with all parts.

```typescript
function parseGlobalId(globalId: string): GlobalId
```

### GlobalId Interface

```typescript
interface GlobalId {
  namespace: string;  // "shopana"
  typeName: string;   // "Checkout", "Product", etc.
  id: string;         // Raw UUID
}
```

### Usage

```typescript
import { parseGlobalId } from "@shopana/shared-graphql-guid";

const parsed = parseGlobalId(encodedId);
// {
//   namespace: "shopana",
//   typeName: "Checkout",
//   id: "123e4567-e89b-12d3-a456-426614174000"
// }
```

### When to Use

Use `parseGlobalId()` when you need:
- Type name for routing/dispatch
- Namespace validation
- Full metadata

Use `decodeGlobalIdByType()` when you only need the UUID.

## decodeGlobalId

Alias for `parseGlobalId()`.

```typescript
function decodeGlobalId(globalId: string): GlobalId
```

## Error Messages

| Scenario | Error Message |
|----------|---------------|
| Empty ID | "Global ID cannot be empty." |
| Invalid base64 | "Global ID is not a valid base64 string." |
| Decode fails | "Failed to decode Global ID: {error}" |
| Invalid format | "Invalid Global ID format: {decoded}" |
| Wrong type | "Unexpected Global ID type: {actual}. Expected: {expected}" |
| Wrong namespace | "Unexpected Global ID namespace: {actual}" |

## Related

- [[shared-graphql-guid/index]] — Package overview
- [[shared-graphql-guid/encoding]] — Encoding UUIDs to Global IDs
- [[shared-graphql-guid/entities]] — Entity type definitions
- [[shared-graphql-guid/validators]] — Validation decorators
