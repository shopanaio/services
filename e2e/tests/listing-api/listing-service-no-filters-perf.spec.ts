import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';

const execFileAsync = promisify(execFile);

const PRODUCT_COUNT = 10_000;
const PAGE_SIZE = 20;
const QUERY_RUNS = 5;
const LISTING_PERF_RESULTS_DIR = resolve(process.cwd(), 'test-results/listing-perf/no-filters-10k');
const SEED_META_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'price-facet-10k-seed.json');
const POSTGRES_RAW_LOG_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'no-filters-10k-postgres.log');
const POSTGRES_SQL_SUMMARY_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'no-filters-10k-postgres-sql.txt');
const POSTGRES_COMPARISON_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'no-filters-10k-comparison.json');
const LISTING_SQL_BRANCHES = [
  'listing:page',
  'listing:totalCount',
  'listing:facetsMetadata',
  'listing:facetCounts',
  'listing:virtualFacets',
] as const;

const LISTING_PERF_QUERY = /* GraphQL */ `
  query ListingServicePerf(
    $first: Int!
    $scope: ListingScopeInput!
    $locale: LocaleCode
    $currency: CurrencyCode
    $facets: [ListingProductFilter!]
    $orderBy: ListingOrderByInput
  ) {
    listingQuery {
      listing(
        first: $first
        scope: $scope
        locale: $locale
        currency: $currency
        facets: $facets
        orderBy: $orderBy
      ) {
        totalCount
        edges {
          cursor
          node {
            id
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        facets {
          id
          values {
            id
            count
            selected
          }
        }
      }
    }
  }
`;

test.describe('Listing service no filters perf', () => {
  test.describe.configure({ timeout: 240_000 });

  test('returns mixed group and root source facets without selected filters on 10k products', async ({
    api,
    request,
  }) => {
    await api.session.setupUserAndStore({
      defaultCurrency: 'USD',
      locales: ['en'],
      currencies: ['USD'],
    });

    const projectUuid = decodeGlobalId(api.session.project.id).id;
    const categoryUuid = crypto.randomUUID();
    const categoryId = composeGlobalId('Category', categoryUuid);

    const { stdout } = await execFileAsync(
      'node',
      [
        'scripts/listing-price-facet-perf.mjs',
        '--seed-only',
        '--products',
        String(PRODUCT_COUNT),
        '--project-id',
        projectUuid,
        '--category-id',
        categoryUuid,
        '--out-dir',
        LISTING_PERF_RESULTS_DIR,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        maxBuffer: 1024 * 1024 * 16,
      },
    );
    console.log(stdout.trim());
    const seedMeta = JSON.parse(await readFile(SEED_META_PATH, 'utf8')) as ListingPerfSeedMeta;

    await setPostgresDurationLogging(true);
    try {
      const graphqlUrl = process.env.ADMIN_GRAPHQL_URL;
      if (!graphqlUrl) {
        throw new Error('ADMIN_GRAPHQL_URL environment variable is not set');
      }

      const postgresLogsSince = new Date().toISOString();
      const runMetrics: ListingPerfRunMetric[] = [];

      for (let run = 1; run <= QUERY_RUNS; run += 1) {
        const startedAt = performance.now();
        const response = await request.post(graphqlUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Store-Name': api.session.projectSlug,
            'X-Organization-Id': api.session.organizationId ?? '',
            'X-Currency': 'USD',
            'X-Idempotency-Key': 'listing-service-perf-no-filters-10k',
            Authorization: `Bearer ${api.session.accessToken}`,
          },
          data: {
            operationName: 'ListingServicePerf',
            query: LISTING_PERF_QUERY,
            variables: {
              first: PAGE_SIZE,
              locale: 'en',
              currency: 'USD',
              scope: {
                kind: 'CATEGORY',
                categoryId,
              },
              orderBy: {
                by: 'PRICE',
                direction: 'asc',
              },
            },
          },
        });
        const elapsedMs = performance.now() - startedAt;
        const json = await response.json();

        expect(response.ok()).toBe(true);
        expect(json.errors ?? []).toEqual([]);
        const listing = json.data.listingQuery.listing;
        expect(listing.totalCount).toBe(seedMeta.products);
        expect(json.data.listingQuery.listing.edges).toHaveLength(PAGE_SIZE);
        expect(json.data.listingQuery.listing.pageInfo.hasNextPage).toBe(true);
        expectMixedFacetValues(listing.facets, seedMeta.facetValueKinds);
        expectNoSelectedFacetValues(listing.facets);

        runMetrics.push({ run, elapsedMs, branchTimings: {} });
      }

      const postgresDurations = await readRecentPostgresDurations(postgresLogsSince);
      const branchTimingRuns = extractBranchTimingRuns(postgresDurations.summary);
      for (const metric of runMetrics) {
        metric.branchTimings = Object.fromEntries(
          LISTING_SQL_BRANCHES.map((branch) => [branch, branchTimingRuns[branch]?.[metric.run - 1] ?? null]),
        );
      }

      const comparison = buildRunComparison(runMetrics);
      await writeFile(POSTGRES_COMPARISON_PATH, `${JSON.stringify(comparison, null, 2)}\n`);

      console.log(formatRunComparison(comparison));
      console.log(`postgres raw log: ${POSTGRES_RAW_LOG_PATH}`);
      console.log(`postgres sql timings: ${POSTGRES_SQL_SUMMARY_PATH}`);
      console.log(`comparison: ${POSTGRES_COMPARISON_PATH}`);
    } finally {
      await setPostgresDurationLogging(false);
    }
  });
});

interface ListingPerfSeedMeta {
  products: number;
  facetValueKinds: ListingPerfFacetValueKinds[];
}

interface ListingPerfFacetValueKinds {
  slug: string;
  groupValueHandles: string[];
  rootSourceValueHandles: string[];
}

interface ListingPerfFacetValue {
  id: string;
  count: number;
  selected: boolean;
}

interface ListingPerfFacet {
  id: string;
  values: ListingPerfFacetValue[];
}

interface ListingPerfRunMetric {
  run: number;
  elapsedMs: number;
  branchTimings: Partial<Record<(typeof LISTING_SQL_BRANCHES)[number], number | null>>;
}

function expectMixedFacetValues(
  facets: ListingPerfFacet[],
  expectedFacets: ListingPerfFacetValueKinds[],
): void {
  for (const expectedFacet of expectedFacets) {
    expect(
      expectedFacet.groupValueHandles.length,
      `${expectedFacet.slug} group values`,
    ).toBeGreaterThan(0);
    expect(
      expectedFacet.rootSourceValueHandles.length,
      `${expectedFacet.slug} root source values`,
    ).toBeGreaterThan(0);

    const facet = facets.find((candidate) => candidate.id === expectedFacet.slug);
    expect(facet, `facet ${expectedFacet.slug}`).toBeTruthy();
    expect(facet?.values.map((value) => value.id).sort()).toEqual(
      [...expectedFacet.groupValueHandles, ...expectedFacet.rootSourceValueHandles].sort(),
    );
  }
}

function expectNoSelectedFacetValues(facets: ListingPerfFacet[]) {
  for (const facet of facets) {
    for (const value of facet.values) {
      expect(value.selected, `selected ${facet.id}:${value.id}`).toBe(false);
    }
  }
}

async function setPostgresDurationLogging(enabled: boolean) {
  await execFileAsync('docker', [
    'exec',
    'shopana-e2e-postgres',
    'psql',
    '-U',
    'postgres',
    '-d',
    'portal',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    enabled ? 'ALTER SYSTEM SET log_min_duration_statement = 0' : 'ALTER SYSTEM RESET log_min_duration_statement',
    '-c',
    'SELECT pg_reload_conf()',
  ]);
}

async function readRecentPostgresDurations(since: string): Promise<{ summary: string }> {
  const { stdout } = await execFileAsync(
    'sh',
    [
      '-lc',
      `docker logs --since '${since}' shopana-e2e-postgres 2>&1`,
    ],
    { maxBuffer: 1024 * 1024 * 32 },
  );

  const entries = extractPostgresDurationEntries(stdout);
  const summary = entries.length > 0 ? entries.join('\n\n---\n\n') : 'No postgres duration statements found.';

  await mkdir(LISTING_PERF_RESULTS_DIR, { recursive: true });
  await writeFile(POSTGRES_RAW_LOG_PATH, stdout);
  await writeFile(POSTGRES_SQL_SUMMARY_PATH, summary);

  return { summary };
}

function extractPostgresDurationEntries(log: string): string[] {
  const lines = log.split(/\r?\n/);
  const entries: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.includes('duration:')) {
      continue;
    }

    const entry = [line];
    for (let offset = 1; offset <= 12 && index + offset < lines.length; offset++) {
      const nextLine = lines[index + offset];
      if (nextLine.includes('duration:')) {
        break;
      }

      if (nextLine.trim().length > 0) {
        entry.push(nextLine);
      }
    }

    entries.push(entry.join('\n'));
  }

  return entries;
}

function extractBranchTimingRuns(summary: string): Record<(typeof LISTING_SQL_BRANCHES)[number], number[]> {
  const timings = Object.fromEntries(LISTING_SQL_BRANCHES.map((branch) => [branch, []])) as Record<
    (typeof LISTING_SQL_BRANCHES)[number],
    number[]
  >;

  for (const entry of summary.split('\n\n---\n\n')) {
    if (!entry.includes('execute <unnamed>:')) {
      continue;
    }

    const duration = entry.match(/duration: ([0-9.]+) ms\s+execute <unnamed>:/);
    if (!duration) {
      continue;
    }

    for (const branch of LISTING_SQL_BRANCHES) {
      if (entry.includes(`/* ${branch} */`)) {
        timings[branch].push(Number(duration[1]));
        break;
      }
    }
  }

  return timings;
}

function buildRunComparison(runMetrics: ListingPerfRunMetric[]) {
  const first = runMetrics[0];
  const last = runMetrics[runMetrics.length - 1];

  return {
    runs: runMetrics.map((metric) => ({
      run: metric.run,
      elapsedMs: Number(metric.elapsedMs.toFixed(3)),
      branchTimingsMs: Object.fromEntries(
        Object.entries(metric.branchTimings).map(([branch, timing]) => [
          branch,
          typeof timing === 'number' ? Number(timing.toFixed(3)) : null,
        ]),
      ),
    })),
    firstVsLast: {
      elapsedMs: {
        first: Number(first.elapsedMs.toFixed(3)),
        last: Number(last.elapsedMs.toFixed(3)),
        delta: Number((last.elapsedMs - first.elapsedMs).toFixed(3)),
      },
      branchTimingsMs: Object.fromEntries(
        LISTING_SQL_BRANCHES.map((branch) => {
          const firstTiming = first.branchTimings[branch];
          const lastTiming = last.branchTimings[branch];
          return [
            branch,
            {
              first: typeof firstTiming === 'number' ? Number(firstTiming.toFixed(3)) : null,
              last: typeof lastTiming === 'number' ? Number(lastTiming.toFixed(3)) : null,
              delta:
                typeof firstTiming === 'number' && typeof lastTiming === 'number'
                  ? Number((lastTiming - firstTiming).toFixed(3))
                  : null,
            },
          ];
        }),
      ),
    },
  };
}

function formatRunComparison(comparison: ReturnType<typeof buildRunComparison>): string {
  const lines = [
    `listing service elapsed runs=${comparison.runs.map((run) => `${run.run}:${run.elapsedMs}ms`).join(' ')}`,
    `first-vs-last elapsed=${comparison.firstVsLast.elapsedMs.first}ms -> ${comparison.firstVsLast.elapsedMs.last}ms delta=${comparison.firstVsLast.elapsedMs.delta}ms`,
    'first-vs-last postgres execute:',
  ];

  for (const [branch, timing] of Object.entries(comparison.firstVsLast.branchTimingsMs)) {
    lines.push(`${branch}: ${timing.first}ms -> ${timing.last}ms delta=${timing.delta}ms`);
  }

  return lines.join('\n');
}
