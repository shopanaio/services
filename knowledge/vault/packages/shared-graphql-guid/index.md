---
tags:
  - package
  - graphql
  - global-id
  - relay
related:
  - type-resolver
  - graphql-federation
---
# @shopana/shared-graphql-guid

Utilities for composing and parsing Relay-compliant global IDs.

## Overview

Global ID is a Relay-compliant identifier for uniquely identifying entities across the Shopana system. The format:

```
Raw:     gid://shopana/Checkout/123e4567-e89b-12d3-a456-426614174000
Encoded: Z2lkOi8vc2hvcGFuYS9DaGVja291dC8xMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDA=
```

## Features

- **Encoding** — UUID to base64 Global ID
- **Decoding** — base64 Global ID to UUID with type validation
- **Validators** — `@IsGlobalId` and `@IsGlobalIdArray` decorators
- **Type-safe** — `GlobalIdEntity` enum for all entity types

## Quick Example

```typescript
import {
  encodeGlobalIdByType,
  decodeGlobalIdByType,
  GlobalIdEntity
} from "@shopana/shared-graphql-guid";

// Encode
const globalId = encodeGlobalIdByType(uuid, GlobalIdEntity.Product);

// Decode with type validation
const uuid = decodeGlobalIdByType(globalId, GlobalIdEntity.Product);
```

## Documentation

| Topic | Description |
|-------|-------------|
| [[shared-graphql-guid/encoding]] | encodeGlobalIdByType, composeGlobalId |
| [[shared-graphql-guid/decoding]] | decodeGlobalIdByType, parseGlobalId |
| [[shared-graphql-guid/validators]] | @IsGlobalId, @IsGlobalIdArray decorators |
| [[shared-graphql-guid/entities]] | GlobalIdEntity enum, all entity types |

## Related

- [[type-resolver/index]] — Uses Global IDs in resolvers
- [[type-resolver/service-pattern]] — Service base class pattern with Global IDs
