# Listing price + facet performance report

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

The test seeds data once and then performs 5 identical GraphQL listing requests.

## Dataset

- Products: 10,000
- Page size: 20
- Scope: category listing
- Sort: `PRICE asc`
- Price filter: `20_000..60_000` minor units
- Selected option facet values: 10 values across 4 OR groups

Selected option filters:

| Facet      | Selected values        |
| ---------- | ---------------------- |
| `color`    | `red`, `blue`, `green` |
| `material` | `cotton`, `linen`      |
| `size`     | `m`, `l`, `xl`         |
| `style`    | `classic`, `modern`    |

## Correctness checks

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

| Facet      | Value     | Count |
| ---------- | --------- | ----: |
| `color`    | `red`     |   144 |
| `color`    | `blue`    |   144 |
| `color`    | `green`   |   144 |
| `material` | `cotton`  |   288 |
| `material` | `linen`   |   144 |
| `size`     | `m`       |   144 |
| `size`     | `l`       |   144 |
| `size`     | `xl`      |   144 |
| `style`    | `classic` |   216 |
| `style`    | `modern`  |   216 |

## Service timings

The measured service time is the full Playwright HTTP POST to the admin GraphQL endpoint.

| Run | Service elapsed |
| --: | --------------: |
|   1 |     4674.885 ms |
|   2 |     5054.258 ms |
|   3 |     3530.435 ms |
|   4 |     3962.903 ms |
|   5 |     2950.686 ms |

First vs last:

```text
4674.885ms -> 2950.686ms
delta=-1724.198ms
```

## PostgreSQL branch timings

Postgres `log_min_duration_statement = 0` was enabled during the 5 listing calls. SQL branches are
labeled with comments:

- `listing:page`
- `listing:totalCount`
- `listing:facetsMetadata`
- `listing:facetCounts`
- `listing:virtualFacets`

| Branch                   |       Run 1 |       Run 2 |       Run 3 |       Run 4 |       Run 5 |
| ------------------------ | ----------: | ----------: | ----------: | ----------: | ----------: |
| `listing:page`           | 3951.989 ms | 4509.626 ms | 3064.968 ms | 3761.895 ms | 2527.365 ms |
| `listing:totalCount`     | 3189.785 ms | 4284.638 ms | 2614.850 ms | 3162.136 ms | 2212.256 ms |
| `listing:facetsMetadata` | 2262.546 ms | 3433.320 ms | 1993.310 ms | 2579.310 ms | 1680.189 ms |
| `listing:facetCounts`    | 4097.290 ms | 4533.282 ms | 3371.541 ms | 3819.853 ms | 2827.595 ms |
| `listing:virtualFacets`  | 2316.255 ms | 3620.391 ms | 2062.797 ms | 2677.199 ms | 1740.924 ms |

First vs last:

| Branch                   |       First |        Last |        Delta |
| ------------------------ | ----------: | ----------: | -----------: |
| `listing:page`           | 3951.989 ms | 2527.365 ms | -1424.624 ms |
| `listing:totalCount`     | 3189.785 ms | 2212.256 ms |  -977.529 ms |
| `listing:facetsMetadata` | 2262.546 ms | 1680.189 ms |  -582.357 ms |
| `listing:facetCounts`    | 4097.290 ms | 2827.595 ms | -1269.695 ms |
| `listing:virtualFacets`  | 2316.255 ms | 1740.924 ms |  -575.331 ms |

The heaviest branch in the last run was `listing:facetCounts`.

## After refactoring: `listing:page`

Follow-up run after the page-query refactoring:

```text
Date: 2026-07-03
Result: 1 passed (1.2m)
```

New `listing:page` SQL timings:

|     Run | Before refactoring | After refactoring |        Delta | Improvement |
| ------: | -----------------: | ----------------: | -----------: | ----------: |
|       1 |        3951.989 ms |         83.285 ms | -3868.704 ms |       97.9% |
|       2 |        4509.626 ms |        101.319 ms | -4408.307 ms |       97.8% |
|       3 |        3064.968 ms |        126.242 ms | -2938.726 ms |       95.9% |
|       4 |        3761.895 ms |        185.153 ms | -3576.742 ms |       95.1% |
|       5 |        2527.365 ms |        104.978 ms | -2422.387 ms |       95.8% |
| Average |        3563.169 ms |        120.195 ms | -3442.973 ms |       96.6% |

First vs last after refactoring:

```text
83.285ms -> 104.978ms
delta=21.693ms
```

## After refactoring: all listing SQL branches

Follow-up run after refactoring all listing SQL branches:

```text
Date: 2026-07-04
Result: 1 passed (1.4m)
```

Latest SQL timings:

| Run | Service elapsed | `listing:page` | `listing:totalCount` | `listing:facetsMetadata` | `listing:facetCounts` | `listing:virtualFacets` |
| --: | --------------: | -------------: | -------------------: | -----------------------: | --------------------: | ----------------------: |
|   1 |     4337.376 ms |      72.785 ms |            22.703 ms |                18.825 ms |           3344.555 ms |               45.649 ms |
|   2 |     3764.609 ms |     137.135 ms |            36.506 ms |                44.677 ms |           3218.745 ms |               56.604 ms |
|   3 |     3514.796 ms |      78.400 ms |            23.568 ms |                26.215 ms |           3138.876 ms |               40.669 ms |
|   4 |     4368.009 ms |      93.118 ms |            23.207 ms |                19.847 ms |           4082.101 ms |               52.972 ms |
|   5 |     3733.448 ms |      79.041 ms |            14.572 ms |                 9.024 ms |           3464.194 ms |               31.677 ms |

First vs last after all-branch refactoring:

| Metric                   |       First |        Last |       Delta |
| ------------------------ | ----------: | ----------: | ----------: |
| Service elapsed          | 4337.376 ms | 3733.448 ms | -603.927 ms |
| `listing:page`           |   72.785 ms |   79.041 ms |    6.256 ms |
| `listing:totalCount`     |   22.703 ms |   14.572 ms |   -8.131 ms |
| `listing:facetsMetadata` |   18.825 ms |    9.024 ms |   -9.801 ms |
| `listing:facetCounts`    | 3344.555 ms | 3464.194 ms |  119.639 ms |
| `listing:virtualFacets`  |   45.649 ms |   31.677 ms |  -13.972 ms |

## Artifacts

Current generated artifacts from the last Playwright run:

- `e2e/test-results/listing-perf/price-facet-10k-seed.json`
- `e2e/test-results/listing-perf/price-facet-10k-comparison.json`
- `e2e/test-results/listing-perf/price-facet-10k-postgres.log`
- `e2e/test-results/listing-perf/price-facet-10k-postgres-sql.txt`

Do not store reports under `e2e/test-results`: Playwright can clean that directory on the next run.

## Notes

- `virtualFacets` are generated facets, not catalog facets. In this API they are `available` and
  `price`.
- The price range filter is part of `facets` input: `{ price: { min: 20000, max: 60000 } }`.
- Branch SQL statements run in parallel, so branch timings should not be summed.
