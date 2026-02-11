---
tags:
  - shared-graphql-guid
  - validation
  - decorators
related:
  - shared-graphql-guid/index
  - shared-graphql-guid/decoding
  - shared-graphql-guid/entities
---
# Validators

Class-validator decorators that validate and transform Global IDs.

## @IsGlobalId

Validates and transforms a single Global ID to UUID.

```typescript
function IsGlobalId(options?: ValidationOptions & {
  entityType?: GlobalIdEntity
}): PropertyDecorator
```

### Features

- Transforms base64 Global ID → raw UUID
- Validates result is valid UUID7
- Optional entity type validation

### Usage

```typescript
import { IsGlobalId, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { Expose } from "class-transformer";

class CheckoutPromoCodeAddDto {
  @Expose()
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format"
  })
  checkoutId!: string;  // Transformed from base64 to UUID
}
```

### Without Entity Type

```typescript
class GenericDto {
  @Expose()
  @IsGlobalId()  // Accepts any valid Global ID type
  entityId!: string;
}
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `entityType` | `GlobalIdEntity?` | Expected entity type |
| `message` | `string?` | Custom error message |
| `each` | `boolean?` | Validate each item (for arrays) |

## @IsGlobalIdArray

Validates and transforms an array of Global IDs.

```typescript
function IsGlobalIdArray(options?: ValidationOptions & {
  entityType?: GlobalIdEntity
}): PropertyDecorator
```

### Features

- Transforms each base64 Global ID → UUID
- Validates all items are UUID7
- Optional type validation for all items

### Usage

```typescript
import { IsGlobalIdArray, GlobalIdEntity } from "@shopana/shared-graphql-guid";

class CheckoutLinesRemoveDto {
  @Expose()
  @IsGlobalId()
  checkoutId!: string;

  @Expose()
  @IsGlobalIdArray({ entityType: GlobalIdEntity.CheckoutLine })
  lineIds!: string[];  // All transformed to UUIDs
}
```

### Mixed Types

```typescript
class BulkOperationDto {
  @Expose()
  @IsGlobalIdArray()  // Any valid Global ID types
  entityIds!: string[];
}
```

## How It Works

1. **Transform phase** — `class-transformer` runs first
2. **Decode** — Base64 → UUID using `decodeGlobalIdByType()`
3. **Validate phase** — `class-validator` validates UUID7 format
4. **Result** — DTO property contains raw UUID

```typescript
// Input from API
{ checkoutId: "Z2lkOi8vc2hvcGFuYS9DaGVja291dC8xMjMuLi4=" }

// After transformation + validation
{ checkoutId: "123e4567-e89b-12d3-a456-426614174000" }
```

## Real-World Examples

### Checkout DTOs

```typescript
export class CheckoutPromoCodeAddDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  code!: string;
}
```

### Lines Update

```typescript
export class CheckoutLinesUpdateDto {
  @Expose()
  @IsGlobalId()
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineUpdateInput)
  lines!: LineUpdateInput[];
}
```

## Related

- [[shared-graphql-guid/index]] — Package overview
- [[shared-graphql-guid/decoding]] — Decoding functions used internally
- [[shared-graphql-guid/entities]] — Entity type definitions
