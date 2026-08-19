# Media Service — API & Business Logic Completion Plan

> Ground rules (per root `AGENTS.md`): backward compatibility and backfilling
> are strictly forbidden. No stage/production data exists. Every task below
> may change schemas, DTOs, and GraphQL fields directly — no `@deprecated`,
> no dual-write, no compatibility shims. Migrations may alter/drop columns
> outright; no backfill scripts are needed.
>
> All new mutation/query logic follows the existing `BaseScript` /
> `@ZodSchema` / `@Policy` / `@Transactional` / `DataLoader` conventions
> documented in `knowledge/vault/packages/shared-kernel/*` and
> `knowledge/vault/patterns/dataloader.md`. Nothing here introduces a new
> architectural pattern; it completes gaps against the existing one.

## Source of truth for the gaps

This plan closes every gap found by direct code inspection of
`services/media/src`:

1. **CDN transform/signing adapter registry has zero registered adapters**
   (`src/infrastructure/cdn/CdnAdapterRegistry.ts`,
   `src/infrastructure/cdn/CdnDeliveryService.ts:494-543`) — any
   `transformStrategy`/`signingMode` other than `"NONE"` always fails with
   `TRANSFORM_ADAPTER_UNAVAILABLE` / `SIGNING_ADAPTER_UNAVAILABLE` and
   silently falls back to the raw origin URL.
2. **No secret-resolution path for `secretRef`** — the schema documents
   `secretRef` as "a reference to an external secret" but nothing in the
   codebase resolves it to an actual value.
3. **SSRF in `fileUploadFromUrl`**
   (`src/scripts/file/FileUploadFromUrlScript.ts:223-287`) — fetches a fully
   client-controlled URL with no private-network/metadata-endpoint
   blocklist, no redirect/protocol restriction, and no response-size cap,
   then republishes the result as a public S3 URL.
4. **No MIME allowlist** on `fileUpload` / `fileUploadFromUrl` — only avatar
   upload restricts content type.
5. **No GraphQL query-cost protection** — no depth limit, no complexity
   limit, `introspection: true` hardcoded regardless of environment on both
   Apollo servers (`src/api/graphql-admin/server.ts`,
   `src/api/graphql-storefront/server.ts`).
6. **GraphQL mutation input bypasses validation** — `@ZodSchema` is only
   used inside the internal broker/action layer; `MediaMutationResolver`
   calls `kernel.runScript()` directly with unvalidated DTOs.
7. **Storefront N+1** — `loadStorefrontFile`
   (`src/resolvers/storefront/helpers/storefrontFile.ts:10-29`) queries
   `repository.file.findByOwner()` directly instead of going through
   `ctx.loaders.file`, issuing one query per resolved media field in a
   federated list.
8. **No pagination ceiling** — `FileRepository.getConnection`
   (`src/repositories/FileRepository.ts:570-620`) passes `first`/`last`
   straight through with no local max-page-size clamp.
9. **Error leakage** — `FileUploadFromUrlScript` returns raw
   `error.message` from a failed fetch to the client; neither Apollo server
   configures `formatError`, so unexpected thrown errors fall back to
   Apollo's default (potentially leaking stack context in non-prod).
10. **No discoverability for adapter keys** — `transformStrategy` /
    `signingMode` are free-text strings with no admin-facing way to see
    which keys are actually registered and usable.

Not in scope (verified as intentionally out of media's ownership, not a
gap): video transcoding, PDF/document preview rendering, and 3D format
conversion. `media.media_sources` rows are created by plain CRUD
(`src/scripts/mediaSource/MediaSourceScripts.ts`) — the actual transcoding
is owned by an external processor that registers the resulting file, per
`README.md`'s "Data resolved at request time" section. No workflow in this
service is expected to perform that conversion itself.

---

## Phase 1 — CDN Secret Provider

The signing adapter (Phase 2) needs a way to turn `secretRef` into an actual
secret value without ever persisting the value in `media`'s database.

### Task 1.1: `SecretProvider` interface

**File:** `src/infrastructure/secrets/SecretProvider.ts` (new)

```typescript
export interface SecretProvider {
  resolve(secretRef: string): Promise<string>;
}
```

### Task 1.2: Environment-backed implementation

**File:** `src/infrastructure/secrets/EnvSecretProvider.ts` (new)

`secretRef` is a key into `service.secrets` from
`@shopana/shared-service-config` (the same config module already used for
`buildS3Config`). Resolution failure throws `FatalError` (not retryable —
misconfiguration, not a transient fault) — see
`knowledge/vault/packages/shared-kernel/errors.md`.

```typescript
import { FatalError } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { SecretProvider } from "./SecretProvider.js";

export class EnvSecretProvider implements SecretProvider {
  async resolve(secretRef: string): Promise<string> {
    const { service } = getServiceConfig("media");
    const value = service.secrets?.[secretRef];
    if (!value) {
      throw new FatalError(
        `CDN secret "${secretRef}" is not configured`,
        { secretRef },
        "CDN_SECRET_NOT_FOUND",
      );
    }
    return value;
  }
}
```

**Acceptance criteria**
- No secret value is ever written to `media.cdn_configurations` or logged.
- Missing secret throws `FatalError`, surfaced by `CdnDeliveryService` as a
  `SIGNING_ADAPTER_FAILED` user error (fallback to origin URL), not a 500.

---

## Phase 2 — Extend the transform vocabulary, then register default adapters

Decision from stakeholder review: **imgix, Cloudinary, Bunny.net, ImageKit,
and Cloudflare Images** are the concrete providers this phase must support
without a per-provider code branch. Unknown/future providers stay covered
only by the generic extension point (registry + reference adapters) — no
speculative adapters for providers not on this list.

These five providers do **not** agree on:
- **Key names** — imgix `w`/`h`, Cloudinary `w`/`h` too, but ImageKit
  `tr=...w-300...`, Cloudflare `width`/`height`. Already solved by the
  existing `transform_config.parameterMap` (key remap only).
- **Value vocabularies** — a "cover" fit is `fit=fill` in imgix,
  `c_fill` in Cloudinary, `fit=cover` in Cloudflare Images, and Bunny
  expresses it as a boolean `crop=true` rather than a fit keyword at all.
  **Nothing in the current code remaps values, only keys** — this is a
  real gap, independent of the adapter registry.
- **URL shape** — imgix/Bunny are flat query strings; Cloudinary and
  Cloudflare Images encode a comma-joined options block into a *path
  segment*; ImageKit encodes the same kind of block into a *single query
  parameter* (`tr=w-300,h-200,fo-center`). Naively rendering these with the
  existing `url_template` placeholder substitution breaks the moment a
  field is optional (the literal `w_` prefix survives with the value
  dropped, producing `w_,h_200`), so this needs a dedicated composer, not
  more `url_template` placeholders.

### Task 2.0: Split `crop` into `fit` + `gravity`

The current model has one `crop: CropRegion` field with five anchor
values, no concept of *how* the image is fit into the box (cover, contain,
fill, etc.) as distinct from *where* it's anchored. Split it — this is a
breaking schema change, which is allowed.

**File:** `src/api/graphql-admin/file.graphql`,
`src/api/graphql-storefront/schema/file.graphql` — replace:

```graphql
enum CropRegion { BOTTOM CENTER LEFT RIGHT TOP }

input ImageTransformInput {
  crop: CropRegion
  maxHeight: Int
  maxWidth: Int
  preferredContentType: ImageContentType
  scale: Int = 1
}
```

with:

```graphql
"""How the image is resized to fit the requested box."""
enum ImageFitMode { COVER CONTAIN FILL INSIDE OUTSIDE }

"""Anchor used when FIT_MODE crops or pads the image."""
enum ImageGravity {
  CENTER TOP BOTTOM LEFT RIGHT
  TOP_LEFT TOP_RIGHT BOTTOM_LEFT BOTTOM_RIGHT
  AUTO
}

input ImageTransformInput {
  fit: ImageFitMode
  gravity: ImageGravity
  maxHeight: Int
  maxWidth: Int
  preferredContentType: ImageContentType
  scale: Int = 1
}
```

`AUTO` is an opaque "let the provider decide" hint (entropy/saliency/face
crop) — providers that don't support it fall back to `CENTER` via
`allowedGravities` validation (Task 2.1).

**File:** `src/infrastructure/cdn/CdnAdapterRegistry.ts` —
`CdnNormalizedTransform.crop` → `fit?: string; gravity?: string`.

**File:** `src/infrastructure/cdn/CdnDeliveryService.ts` —
`ImageTransformOptions.crop` → `fit`/`gravity`; `mergeTransformValues`,
`validateTransformValues`, `buildUrl`, and `renderTemplate`'s placeholder
set (`{crop}` → `{fit} {gravity}`) updated accordingly.
`transform_config.allowedCrops` → `allowedFits` + `allowedGravities`.

**File:** `src/resolvers/storefront/ImageResolver.ts`,
`src/resolvers/storefront/helpers/storefrontFile.ts`,
`src/resolvers/admin/FileResolver.ts`,
`src/scripts/cdn/CdnConfigurationScripts.ts` (test/preview transform arg
mapping) — pass `fit`/`gravity` through instead of `crop`.

**File:** `README.md` — update the transform contract section and JSON
example to `fit`/`gravity`.

### Task 2.1: Per-field value remapping in `transform_config`

Add a `valueMap` block so each `CdnConfiguration` can translate a
normalized value (`"COVER"`, `"AUTO"`, `"WEBP"`, …) into whatever token the
selected provider expects, independent of the key remap already provided
by `parameterMap`.

**File:** `src/infrastructure/cdn/CdnDeliveryService.ts`, in `buildUrl`
(and the new composed-options adapter from Task 2.3) — before applying
`parameterMap`, resolve each value through:

```typescript
function mapValue(
  transformConfig: Record<string, unknown>,
  field: string,
  normalizedValue: string,
): string {
  const valueMap = transformConfig.valueMap as
    | Record<string, Record<string, string>>
    | undefined;
  return valueMap?.[field]?.[normalizedValue] ?? normalizedValue.toLowerCase();
}
```

Example imgix profile using `valueMap` for `fit`:

```json
{
  "parameterMap": { "width": "w", "height": "h", "fit": "fit", "gravity": "crop", "format": "fm", "quality": "q" },
  "valueMap": {
    "fit": { "COVER": "fill", "CONTAIN": "clip", "FILL": "scale", "INSIDE": "fit", "OUTSIDE": "min" },
    "gravity": { "TOP_LEFT": "top,left", "AUTO": "entropy" }
  }
}
```

**Acceptance criteria:** the same `ImageTransformInput { fit: COVER }`
produces `fit=fill` for an imgix-configured profile and `fit=cover` for a
Cloudflare-configured profile from the same normalized request, with zero
code branching on provider name.

### Task 2.2: Generic HMAC signing adapter

Provider-neutral signed-URL scheme: an expiring token computed over the
path, appended as query parameters. Kept as the one reference signing
adapter for now — none of the five target providers were called out for
signed delivery in this phase; a CloudFront (RSA/key-pair) or
Cloudinary-token signing adapter is a follow-up if/when one of those
providers' signed-URL feature is actually needed, added the same way
without touching `CdnDeliveryService`.

**File:** `src/infrastructure/cdn/adapters/hmacSigningAdapter.ts` (new)

```typescript
import { createHmac } from "node:crypto";
import type { CdnAdapterContext } from "../CdnAdapterRegistry.js";
import type { SecretProvider } from "../../secrets/SecretProvider.js";

const DEFAULT_TTL_SECONDS = 300;

export function createHmacSigningAdapter(secrets: SecretProvider) {
  return async (context: CdnAdapterContext): Promise<string> => {
    const secretRef = context.configuration.secretRef;
    if (!secretRef) throw new Error("secretRef is required for hmac signing");
    const secret = await secrets.resolve(secretRef);

    const url = new URL(context.url);
    const expires = Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS;
    const payload = `${url.pathname}${url.search}:${expires}`;
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    url.searchParams.set("expires", String(expires));
    url.searchParams.set("signature", signature);
    return url.toString();
  };
}
```

Registered under adapter key `"hmac-v1"`.

### Task 2.3: Composed-options transform adapter

Cloudinary, Cloudflare Images, and ImageKit all embed transform options as
one comma-joined block (in a path segment or a single query parameter),
correctly omitting any field the caller didn't request. This is a single
generic, config-driven adapter — not three adapters — because all three
providers only differ in separators, key names, and placement, which the
existing "provider behavior is data-driven" design principle already
expects to live in `transform_config`, not in code.

**File:** `src/infrastructure/cdn/adapters/composedOptionsTransformAdapter.ts`
(new)

```typescript
import type { CdnAdapterContext } from "../CdnAdapterRegistry.js";

interface ComposeConfig {
  placement: "path" | "query";
  queryParamName?: string;      // required when placement === "query"
  itemSeparator: string;        // e.g. ","
  pairSeparator: string;        // e.g. "_" (Cloudinary) or "=" (Cloudflare) or "-" (ImageKit)
  keyMap: Record<string, string>;
}

const NORMALIZED_FIELDS = ["width", "height", "fit", "gravity", "format", "quality", "scale"] as const;

export function composedOptionsTransformAdapter(context: CdnAdapterContext): string {
  const compose = (context.configuration.transformConfig as Record<string, unknown>)
    .compose as ComposeConfig;

  const pairs = NORMALIZED_FIELDS
    .map((field) => {
      const rawValue = context.transform[field as keyof typeof context.transform];
      if (rawValue === undefined || rawValue === null) return null;
      const key = compose.keyMap[field];
      if (!key) return null;
      const value = mapValue(context.configuration.transformConfig as Record<string, unknown>, field, String(rawValue));
      return `${key}${compose.pairSeparator}${value}`;
    })
    .filter((pair): pair is string => pair !== null);

  const optionsBlock = pairs.join(compose.itemSeparator);
  const base = new URL(context.configuration.baseUrl);
  const pathPrefix = context.configuration.pathPrefix.replace(/^\/+|\/+$/g, "");

  if (compose.placement === "query") {
    const url = new URL(context.url);
    url.searchParams.set(compose.queryParamName!, optionsBlock);
    return url.toString();
  }

  return `${base.origin}/${[pathPrefix, optionsBlock, context.objectPath].filter(Boolean).join("/")}`;
}
```

Registered under adapter key `"composed-options-v1"`.

### Task 2.4: Reference `CdnConfiguration` profiles for the five providers

Ship these as fixtures/seed data referenced from admin-facing docs (not
code paths — the point is that none of them need a new adapter beyond
`hmac-v1` or `composed-options-v1`):

| Provider | `transformStrategy` | Shape | Notes |
|---|---|---|---|
| imgix | `"NONE"` (plain `url_template`) | query string | `parameterMap` + `valueMap` only (Task 2.1) |
| Cloudflare Images | `"composed-options-v1"` | path segment `/cdn-cgi/image/<options>/` | `pairSeparator: "="`, all keys pass through as-is |
| Cloudinary | `"composed-options-v1"` | path segment | `pairSeparator: "_"`; `keyMap: { width: "w", height: "h", fit: "c", gravity: "g", format: "f", quality: "q" }` |
| ImageKit | `"composed-options-v1"` | single query param `tr=` | `placement: "query"`, `queryParamName: "tr"`, `pairSeparator: "-"` |
| Bunny.net Optimizer | **needs a small dedicated adapter**, see below | query string | fit is a boolean `crop` flag plus a conditional `crop_gravity` param, not a fit keyword — `valueMap`/`composed-options` can't express "presence of gravity depends on fit value" |

**Task 2.4a — Bunny adapter:** `src/infrastructure/cdn/adapters/bunnyTransformAdapter.ts`
(new), registered as `"bunny-v1"`: sets `width`/`height`/`quality` via
plain query params, derives `crop=true` when `fit` is `COVER` or `FILL`
(and omits it otherwise), and only emits `crop_gravity` when `crop=true`.
This is the one provider-specific branch this phase actually needs, and it
stays isolated in its own adapter file — `CdnDeliveryService` never learns
Bunny exists.

**Acceptance criteria**
- Each of the five providers is reachable by setting only
  `transformStrategy`, `transformConfig` (including `parameterMap`/
  `valueMap`/`compose`), and `providerConfig` on a `CdnConfiguration` row —
  no code change per provider except the one Bunny adapter.
- `CdnDeliveryService.assertConfiguredOrigin` still rejects any adapter
  output outside the configured `baseUrl` origin, including for the
  composed-options and Bunny adapters.
- Registering `hmac-v1`, `composed-options-v1`, and `bunny-v1` at bootstrap
  removes the `TRANSFORM_ADAPTER_UNAVAILABLE` fallback for all five
  reference profiles.

### Task 2.5: Registration at bootstrap

**File:** `src/media.module.ts` (or wherever the module bootstraps
singletons — align with existing `Kernel.getInstance()` bootstrap order)

```typescript
import { cdnAdapterRegistry } from "./infrastructure/cdn/CdnAdapterRegistry.js";
import { createHmacSigningAdapter } from "./infrastructure/cdn/adapters/hmacSigningAdapter.js";
import { composedOptionsTransformAdapter } from "./infrastructure/cdn/adapters/composedOptionsTransformAdapter.js";
import { bunnyTransformAdapter } from "./infrastructure/cdn/adapters/bunnyTransformAdapter.js";
import { EnvSecretProvider } from "./infrastructure/secrets/EnvSecretProvider.js";

cdnAdapterRegistry.registerSigning("hmac-v1", createHmacSigningAdapter(new EnvSecretProvider()));
cdnAdapterRegistry.registerTransform("composed-options-v1", composedOptionsTransformAdapter);
cdnAdapterRegistry.registerTransform("bunny-v1", bunnyTransformAdapter);
```

### Task 2.6: Admin discoverability query

Admins currently have no way to know which `transformStrategy` /
`signingMode` keys are actually usable versus dead strings that always
fall back.

**File:** `src/api/graphql-admin/cdn.graphql` — add:

```graphql
extend type Query {
  cdnAdapterCapabilities: CdnAdapterCapabilities!
}

type CdnAdapterCapabilities {
  transformStrategies: [String!]!
  signingModes: [String!]!
}
```

**File:** `src/resolvers/admin/MediaQueryResolver.ts` — resolve from
`cdnAdapterRegistry.listTransformKeys()` / `listSigningKeys()` (add these
two accessor methods to `CdnAdapterRegistry`).

**Acceptance criteria:** admin UI can populate a select box instead of a
free-text field for `transformStrategy`/`signingMode`.

---

## Phase 3 — Fix SSRF in `fileUploadFromUrl` (blocker)

**File:** `src/scripts/file/FileUploadFromUrlScript.ts`

### Task 3.1: URL policy guard

New helper, applied before every fetch (including redirect targets):

**File:** `src/infrastructure/media/urlFetchPolicy.ts` (new)

```typescript
import { isIP } from "node:net";
import dns from "node:dns/promises";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateOrReservedIp(ip: string): boolean {
  // 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16,
  // 100.64.0.0/10 (CGNAT), ::1, fc00::/7, fe80::/10
  return (
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip) ||
    ip === "::1" ||
    /^fc/i.test(ip) ||
    /^fe80/i.test(ip)
  );
}

export async function assertFetchAllowed(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) {
    throw new Error("This host is not allowed");
  }
  if (isIP(url.hostname) && isPrivateOrReservedIp(url.hostname)) {
    throw new Error("This host is not allowed");
  }
  if (!isIP(url.hostname)) {
    const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
    if (records.some((r) => isPrivateOrReservedIp(r.address))) {
      throw new Error("This host resolves to a disallowed address");
    }
  }
  return url;
}
```

### Task 3.2: Apply the guard, disable redirects, cap response size

```typescript
private async fetchFileFromUrl(url: string): Promise<FetchResult | FetchError> {
  if (url.startsWith("data:")) return this.parseDataUrl(url);

  try {
    await assertFetchAllowed(url);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "URL not allowed" };
  }

  const response = await fetch(url, {
    method: "GET",
    redirect: "manual", // do not silently follow to an unvalidated host
    headers: { "User-Agent": "ShopanaMediaService/1.0" },
  });

  if (response.status >= 300 && response.status < 400) {
    return { success: false, error: "Redirects are not followed for security reasons" };
  }
  if (!response.ok) {
    return { success: false, error: `HTTP error: ${response.status}` };
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  const MAX_BYTES = 50 * 1024 * 1024;
  if (contentLength > MAX_BYTES) {
    return { success: false, error: "File exceeds the maximum allowed size" };
  }

  // stream into a size-capped buffer instead of response.arrayBuffer()
  const buffer = await readWithCap(response.body!, MAX_BYTES);
  ...
}
```

`readWithCap` reads the stream and aborts once `MAX_BYTES` is exceeded even
when `Content-Length` is absent or lied about.

### Task 3.3: Stop leaking raw fetch error text

Replace `fetchResult.error ?? "Failed to fetch file from URL"` in the
caller with a fixed `"Failed to fetch file from URL"` message; log the
detailed `error` server-side via `this.logger.warn` only.

**Acceptance criteria**
- Requesting `http://169.254.169.254/...` or any RFC1918/loopback/link-local
  target returns a `FETCH_FAILED`/`URL_NOT_ALLOWED` user error, never
  reaches `fetch()`.
- A redirect response is rejected, not followed.
- A response advertising or streaming more than the configured cap is
  rejected before the whole body is buffered in memory.
- No raw upstream error text reaches the GraphQL client.

---

## Phase 4 — MIME allowlist for uploads

**Files:** `src/scripts/file/FileUploadScript.ts`,
`src/scripts/file/FileUploadFromUrlScript.ts`

### Task 4.1: Central allowlist

**File:** `src/infrastructure/media/allowedMimeTypes.ts` (new)

```typescript
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm",
  "model/gltf-binary", "model/gltf+json", "model/vnd.usdz+zip",
  "application/pdf",
]);
```

`image/svg+xml` is deliberately excluded — SVG can embed script content and
is served publicly from the CDN origin.

### Task 4.2: Enforce after `analyzeMedia()` sniffing

After the existing magic-byte detection (`analyzeMedia`), reject unknown
mime types with a `UNSUPPORTED_MEDIA_TYPE` user error before the S3 upload
step, in both `FileUploadScript` and `FileUploadFromUrlScript`.

**Acceptance criteria:** uploading an `image/svg+xml` or an executable
payload disguised with a media extension returns a user error and performs
no S3 write.

---

## Phase 5 — GraphQL query-cost protection

**Files:** `src/api/graphql-admin/server.ts`,
`src/api/graphql-storefront/server.ts`

### Task 5.1: Depth + complexity validation rules

Add `graphql-depth-limit` and a complexity estimator (e.g.
`graphql-query-complexity`) as new dependencies of `@shopana/media-service`
(no shared package currently provides this — introduce it locally rather
than inventing a cross-service convention unprompted).

```typescript
import depthLimit from "graphql-depth-limit";

const apollo = new ApolloServer<ServiceContext>({
  introspection: isDevelopment(global),
  validationRules: [depthLimit(8)],
  schema: buildSubgraphSchema(modules),
  ...
});
```

### Task 5.2: Introspection off outside development

Replace the hardcoded `introspection: true` on both servers with
`introspection: isDevelopment(global)` (storefront server already imports
`isDevelopment`; add the same import to the admin server).

**Acceptance criteria:** a deeply nested or introspection query against a
non-development environment is rejected before resolver execution; `curl`
of `/graphql` with an introspection query in a prod-like config returns a
validation error instead of the schema.

---

## Phase 6 — Storefront N+1 fix

**File:** `src/resolvers/storefront/helpers/storefrontFile.ts`

### Task 6.1: Batch loader for storefront file-by-owner lookups

Add a `fileByOwner` DataLoader following the existing pattern in
`knowledge/vault/patterns/dataloader.md` (batch key = owner id, batched via
a new `FileRepository.getByOwnerIds()`).

**File:** `src/loaders/FileByOwnerLoader.ts` (new)
**File:** `src/loaders/Loader.ts` — register `fileByOwner`
**File:** `src/repositories/FileRepository.ts` — add `getByOwnerIds()`
alongside the existing single-owner `findByOwner()`

### Task 6.2: Route `loadStorefrontFile` through the loader

```typescript
export async function loadStorefrontFile(ctx: ServiceContext, ownerId: string) {
  return ctx.loaders.fileByOwner.load(ownerId);
}
```

**Acceptance criteria:** a storefront list query resolving N `Image`/
`Video`/`Model3d` fields issues one batched `files` query, not N queries —
verified with a query-count assertion in an integration test.

---

## Phase 7 — Input validation on GraphQL mutations

**Files:** every method in `src/resolvers/admin/MediaMutationResolver.ts`

### Task 7.1: Zod schema per mutation input

Introduce a `z.object` schema colocated with each DTO
(`src/scripts/{entity}/dto/*.ts`) and apply `@ZodSchema` on the script's
`execute()`, matching `knowledge/vault/patterns/script.md`'s
`@ZodSchema` example — not on the resolver, so scripts stay
context-independent and reusable.

Priority order (highest risk first):
1. `FileUploadFromUrlDto` — bound `sourceUrl` length, reject empty/whitespace.
2. `CdnConfigurationCreate`/`Update` DTOs — bound `baseUrl`, `pathPrefix`,
   `transformStrategy`/`signingMode` string length (already length-checked
   ad hoc in `CdnConfigurationScripts.ts:107`; replace with a schema).
3. `CdnRoutingRuleCreate`/`Update` — bound `priority` range, `conditions`
   shape.
4. Remaining bucket/mediaSource/file DTOs.

**Acceptance criteria:** malformed input (oversized strings, wrong types,
out-of-range numbers) is rejected with a typed `userErrors` entry before
`execute()` runs any repository call — verified by unit tests per script.

### Task 7.2: Pagination ceiling

**File:** `src/repositories/FileRepository.ts:570-620` — clamp `first`/
`last` to a constant `MAX_PAGE_SIZE = 100` before passing to
`@shopana/drizzle-query`, returning a `PAGE_SIZE_TOO_LARGE` user error (not
a silent clamp) when the caller requests more.

---

## Phase 8 — Error masking

**Files:** `src/api/graphql-admin/server.ts`,
`src/api/graphql-storefront/server.ts`

### Task 8.1: `formatError` plugin

Mask non-`GraphQLError`-with-`extensions.code` errors in non-development
environments so an uncaught exception (e.g. the storefront's `"Verified
storefront context is required"` `Error`) never returns its raw message or
stack to the client:

```typescript
formatError: (formattedError, error) => {
  if (isDevelopment(global)) return formattedError;
  if (formattedError.extensions?.code) return formattedError;
  return { message: "Internal server error", extensions: { code: "INTERNAL_SERVER_ERROR" } };
},
```

**Acceptance criteria:** a thrown, non-domain `Error` in production
configuration reaches the client as a generic message with no internal
detail; `userErrors`-carrying mutation payloads are unaffected since those
never throw.

---

## Rollout notes

- Every phase is independently shippable; no ordering dependency except
  Phase 1 → Phase 2 (secret provider before signing adapter).
- Because backfilling is forbidden and no production data exists, DTO/
  schema changes in Phase 7 do not need transition periods — update the
  GraphQL input types and DTOs in place.
- Add integration tests per phase under the service's existing test
  layout; the N+1 fix (Phase 6) and SSRF guard (Phase 3) both need a
  regression test asserting the previously-broken behavior is now blocked.
