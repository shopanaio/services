---
tags:
  - shared-graphql-guid
  - entities
  - enum
related:
  - shared-graphql-guid/index
  - shared-graphql-guid/encoding
  - shared-graphql-guid/decoding
  - shared-graphql-guid/validators
---
# GlobalIdEntity

Enum of all entity types in the system.

## Usage

```typescript
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

encodeGlobalIdByType(uuid, GlobalIdEntity.Product);
decodeGlobalIdByType(globalId, GlobalIdEntity.Product);
```

## Entity Types by Domain

### Checkout

| Entity | Value |
|--------|-------|
| `Checkout` | "Checkout" |
| `CheckoutLine` | "CheckoutLine" |
| `CheckoutDeliveryGroup` | "CheckoutDeliveryGroup" |
| `CheckoutDeliveryAddress` | "CheckoutDeliveryAddress" |
| `CheckoutTag` | "CheckoutTag" |
| `CheckoutNotification` | "CheckoutNotification" |

### Orders

| Entity | Value |
|--------|-------|
| `Order` | "Order" |
| `OrderLine` | "OrderLine" |
| `OrderDeliveryAddress` | "OrderDeliveryAddress" |

### IAM (Identity & Access)

| Entity | Value |
|--------|-------|
| `User` | "User" |
| `Customer` | "Customer" |
| `Organization` | "Organization" |
| `Role` | "Role" |
| `Member` | "Member" |
| `ApiKey` | "ApiKey" |
| `Session` | "Session" |

### Catalog

| Entity | Value |
|--------|-------|
| `Product` | "Product" |
| `ProductVariant` | "ProductVariant" |
| `Variant` | "Variant" |
| `Category` | "Category" |
| `Tag` | "Tag" |
| `Collection` | "Collection" |
| `FacetGroup` | "FacetGroup" |
| `Facet` | "Facet" |
| `FacetValue` | "FacetValue" |
| `FacetSwatch` | "FacetSwatch" |
| `Option` | "Option" |
| `OptionValue` | "OptionValue" |
| `Feature` | "Feature" |
| `FeatureValue` | "FeatureValue" |
| `BulkUpdateItem` | "BulkUpdateItem" |
| `ProductBulkUpdateJob` | "ProductBulkUpdateJob" |
| `VariantPrice` | "VariantPrice" |

### Bundles

| Entity | Value |
|--------|-------|
| `BundleGroup` | "BundleGroup" |
| `BundleItem` | "BundleItem" |
| `BundlePricingTemplate` | "BundlePricingTemplate" |
| `DependencyRule` | "DependencyRule" |
| `ConditionGroup` | "ConditionGroup" |
| `Condition` | "Condition" |
| `DependencyAction` | "DependencyAction" |

### Inventory

| Entity | Value |
|--------|-------|
| `InventoryItem` | "InventoryItem" |
| `Warehouse` | "Warehouse" |

### Media

| Entity | Value |
|--------|-------|
| `File` | "File" |
| `MediaAssetGroup` | "MediaAssetGroup" |
| `Bucket` | "Bucket" |

### Project

| Entity | Value |
|--------|-------|
| `Store` | "Store" |

## GlobalIdType

Type union of all entity values:

```typescript
type GlobalIdType = (typeof GlobalIdEntity)[keyof typeof GlobalIdEntity];
// "Checkout" | "Product" | "User" | ...
```

## GLOBAL_ID_NAMESPACE

Fixed namespace for all Global IDs:

```typescript
export const GLOBAL_ID_NAMESPACE = "shopana" as const;
```

All Global IDs start with `gid://shopana/`.

## Related

- [[shared-graphql-guid/index]] — Package overview
- [[shared-graphql-guid/encoding]] — Encoding UUIDs to Global IDs
- [[shared-graphql-guid/decoding]] — Decoding Global IDs to UUIDs
- [[shared-graphql-guid/validators]] — Validation decorators
