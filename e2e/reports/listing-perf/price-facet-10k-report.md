# Listing Price + Facet Performance Report

Date: 2026-07-03

## Test

Spec:

```text
e2e/tests/listing-api/listing-service-perf.spec.ts
```

Command:

```bash
cd /Users/phl/Projects/shopana-io/services/e2e
NODE_OPTIONS=--experimental-transform-types yarn test tests/listing-api/listing-service-perf.spec.ts
```

Result:

```text
1 passed (1.2m)
```

The test now seeds data once and then performs 5 identical GraphQL listing requests.

## Dataset

- Products: 10,000
- Page size: 20
- Scope: category listing
- Sort: `PRICE asc`
- Price filter: `20_000..60_000` minor units
- Selected option facet values: 10 values across 4 OR groups

Selected option filters:

| Facet | Selected values |
| --- | --- |
| `color` | `red`, `blue`, `green` |
| `material` | `cotton`, `linen` |
| `size` | `m`, `l`, `xl` |
| `style` | `classic`, `modern` |

## Correctness Checks

Each of the 5 service calls verifies:

- `listing.totalCount`
- first page product ids
- selected facet counts
- page size
- `pageInfo.hasNextPage`

Expected filtered product count:

```text
432
```

Expected selected facet counts:

| Facet | Value | Count |
| --- | --- | ---: |
| `color` | `red` | 144 |
| `color` | `blue` | 144 |
| `color` | `green` | 144 |
| `material` | `cotton` | 288 |
| `material` | `linen` | 144 |
| `size` | `m` | 144 |
| `size` | `l` | 144 |
| `size` | `xl` | 144 |
| `style` | `classic` | 216 |
| `style` | `modern` | 216 |

## Service Timings

The measured service time is the full Playwright HTTP POST to the admin GraphQL endpoint.

| Run | Service elapsed |
| ---: | ---: |
| 1 | 4674.885 ms |
| 2 | 5054.258 ms |
| 3 | 3530.435 ms |
| 4 | 3962.903 ms |
| 5 | 2950.686 ms |

First vs last:

```text
4674.885ms -> 2950.686ms
delta=-1724.198ms
```

## PostgreSQL Branch Timings

Postgres `log_min_duration_statement = 0` was enabled during the 5 listing calls. SQL branches are labeled with comments:

- `listing:page`
- `listing:totalCount`
- `listing:facetsMetadata`
- `listing:facetCounts`
- `listing:virtualFacets`

| Branch | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `listing:page` | 3951.989 ms | 4509.626 ms | 3064.968 ms | 3761.895 ms | 2527.365 ms |
| `listing:totalCount` | 3189.785 ms | 4284.638 ms | 2614.850 ms | 3162.136 ms | 2212.256 ms |
| `listing:facetsMetadata` | 2262.546 ms | 3433.320 ms | 1993.310 ms | 2579.310 ms | 1680.189 ms |
| `listing:facetCounts` | 4097.290 ms | 4533.282 ms | 3371.541 ms | 3819.853 ms | 2827.595 ms |
| `listing:virtualFacets` | 2316.255 ms | 3620.391 ms | 2062.797 ms | 2677.199 ms | 1740.924 ms |

First vs last:

| Branch | First | Last | Delta |
| --- | ---: | ---: | ---: |
| `listing:page` | 3951.989 ms | 2527.365 ms | -1424.624 ms |
| `listing:totalCount` | 3189.785 ms | 2212.256 ms | -977.529 ms |
| `listing:facetsMetadata` | 2262.546 ms | 1680.189 ms | -582.357 ms |
| `listing:facetCounts` | 4097.290 ms | 2827.595 ms | -1269.695 ms |
| `listing:virtualFacets` | 2316.255 ms | 1740.924 ms | -575.331 ms |

The heaviest branch in the last run was `listing:facetCounts`.

## Artifacts

Current generated artifacts from the last Playwright run:

- `e2e/test-results/listing-perf/price-facet-10k-seed.json`
- `e2e/test-results/listing-perf/price-facet-10k-comparison.json`
- `e2e/test-results/listing-perf/price-facet-10k-postgres.log`
- `e2e/test-results/listing-perf/price-facet-10k-postgres-sql.txt`

This report is stored outside `e2e/test-results` because Playwright can clean that directory on the next run.

## Notes

- `virtualFacets` are generated facets, not catalog facets. In this API they are `available` and `price`.
- The price range filter is part of `facets` input: `{ price: { min: 20000, max: 60000 } }`.
- Branch SQL statements run in parallel, so branch timings should not be summed.
