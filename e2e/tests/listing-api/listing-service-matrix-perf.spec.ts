import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';

const execFileAsync = promisify(execFile);

const PRODUCT_COUNT = 10_00;
const PAGE_SIZE = 50;
const PRICE_FILTER = { min: 20_000, max: 60_000 } as const;
const LISTING_PERF_RESULTS_DIR = resolve(process.cwd(), 'test-results/listing-perf/matrix-10k');
const SEED_META_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'price-facet-10k-seed.json');
const POSTGRES_RAW_LOG_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'matrix-10k-postgres.log');
const POSTGRES_SQL_SUMMARY_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'matrix-10k-postgres-sql.txt');
const MATRIX_REPORT_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'matrix-10k-comparison.json');

const LISTING_PERF_QUERY = /* GraphQL */ `
  query ListingServicePerfMatrix(
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

const OPTION_FILTER_GROUPS = [
  { facet: 'color', values: ['red', 'blue', 'green'] },
  { facet: 'material', values: ['cotton', 'linen'] },
  { facet: 'size', values: ['m', 'l', 'xl'] },
  { facet: 'style', values: ['classic', 'modern'] },
  { facet: 'brand', values: ['acme', 'northline', 'urbanist', 'everfit'] },
  { facet: 'fit', values: ['regular', 'slim', 'relaxed'] },
  { facet: 'season', values: ['spring', 'summer', 'autumn', 'winter'] },
  { facet: 'pattern', values: ['solid', 'striped', 'checked'] },
] as const;

const SELECTED_OPTION_FACETS = OPTION_FILTER_GROUPS.flatMap((group) =>
  group.values.slice(0, -1).map((value) => ({
    variantFacet: { facet: group.facet, value },
  })),
);

const SELECTED_OPTION_AND_PRICE_FACETS = [
  ...SELECTED_OPTION_FACETS,
  { price: PRICE_FILTER },
] as const;

const PRICE_ONLY_FACETS = [{ price: PRICE_FILTER }] as const;

const SCENARIOS = [
  {
    name: 'newest:no-filters',
    facets: undefined,
    orderBy: { by: 'NEWEST' },
    expected: 'category',
  },
  {
    name: 'newest:price-only',
    facets: PRICE_ONLY_FACETS,
    orderBy: { by: 'NEWEST' },
    expected: 'priceOnly',
  },
  {
    name: 'newest:filters:no-price',
    facets: SELECTED_OPTION_FACETS,
    orderBy: { by: 'NEWEST' },
    expected: 'optionOnly',
  },
  {
    name: 'newest:filters:with-price',
    facets: SELECTED_OPTION_AND_PRICE_FACETS,
    orderBy: { by: 'NEWEST' },
    expected: 'optionAndPrice',
  },
  {
    name: 'price-asc:no-filters',
    facets: undefined,
    orderBy: { by: 'PRICE', direction: 'asc' },
    expected: 'category',
  },
  {
    name: 'price-asc:price-only',
    facets: PRICE_ONLY_FACETS,
    orderBy: { by: 'PRICE', direction: 'asc' },
    expected: 'priceOnly',
  },
  {
    name: 'price-asc:filters:no-price',
    facets: SELECTED_OPTION_FACETS,
    orderBy: { by: 'PRICE', direction: 'asc' },
    expected: 'optionOnly',
  },
  {
    name: 'price-asc:filters:with-price',
    facets: SELECTED_OPTION_AND_PRICE_FACETS,
    orderBy: { by: 'PRICE', direction: 'asc' },
    expected: 'optionAndPrice',
  },
] as const;

test.describe('Listing service matrix perf', () => {
  test.describe.configure({ timeout: 900_000 });

  test('calls listing service with newest and price sorts with and without selected filters', async ({
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
        '--max-old-space-size=12288',
        'scripts/listing-price-facet-perf.mjs',
        '--seed-only',
        '--products',
        String(PRODUCT_COUNT),
        '--page-size',
        String(PAGE_SIZE),
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

    const seedMeta = JSON.parse(await readFile(SEED_META_PATH, 'utf8')) as ListingMatrixSeedMeta;
    const scopedCategory = seedMeta.categories.find(
      (category) => category.id === seedMeta.categoryId,
    );
    if (!scopedCategory) {
      throw new Error(`Seed meta does not include scoped category ${seedMeta.categoryId}`);
    }

    const graphqlUrl = process.env.ADMIN_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('ADMIN_GRAPHQL_URL environment variable is not set');
    }

    await setPostgresDurationLogging(true);
    try {
      const postgresLogsSince = new Date().toISOString();
      const metrics: ListingMatrixRunMetric[] = [];

      for (const scenario of SCENARIOS) {
        const startedAt = performance.now();
        const response = await request.post(graphqlUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Store-Name': api.session.projectSlug,
            'X-Organization-Id': api.session.organizationId ?? '',
            'X-Currency': 'USD',
            'X-Idempotency-Key': `listing-service-matrix-perf-${scenario.name}`,
            Authorization: `Bearer ${api.session.accessToken}`,
          },
          data: {
            operationName: 'ListingServicePerfMatrix',
            query: LISTING_PERF_QUERY,
            variables: {
              first: PAGE_SIZE,
              locale: 'en',
              currency: 'USD',
              scope: {
                kind: 'CATEGORY',
                categoryId,
              },
              facets: scenario.facets,
              orderBy: scenario.orderBy,
            },
          },
        });
        const elapsedMs = performance.now() - startedAt;
        const json = await response.json();

        expect(response.ok()).toBe(true);
        expect(json.errors ?? []).toEqual([]);

        const listing = json.data.listingQuery.listing as ListingMatrixConnection;
        const expectedResult =
          scenario.expected === 'optionOnly'
            ? seedMeta.expected.optionOnly
            : scenario.expected === 'optionAndPrice'
              ? seedMeta.expected.optionAndPrice
              : scenario.expected === 'priceOnly'
                ? seedMeta.expected.priceOnly
                : null;
        const expectedTotal = expectedResult?.expectedTotalCount ?? scopedCategory.productCount;

        expect(listing.totalCount, scenario.name).toBe(expectedTotal);
        expect(listing.edges, scenario.name).toHaveLength(PAGE_SIZE);
        expect(listing.pageInfo.hasNextPage, scenario.name).toBe(true);

        if (scenario.expected === 'optionOnly') {
          expectSelectedFacetValues(
            listing.facets,
            seedMeta.expected.optionOnly.expectedSelectedFacetCounts,
          );
        } else if (scenario.expected === 'optionAndPrice') {
          expectSelectedFacetValues(
            listing.facets,
            seedMeta.expected.optionAndPrice.expectedSelectedFacetCounts,
          );
        } else {
          expectNoSelectedFacetValues(listing.facets);
        }

        metrics.push({
          name: scenario.name,
          elapsedMs: Number(elapsedMs.toFixed(3)),
          totalCount: listing.totalCount,
          edgeCount: listing.edges.length,
        });
      }

      const postgresDurations = await readRecentPostgresDurations(postgresLogsSince);
      const report = {
        products: seedMeta.products,
        variants: seedMeta.variants,
        variantsPerProduct: seedMeta.variantsPerProduct,
        scopedCategory,
        pageSize: PAGE_SIZE,
        metrics,
        sqlTimingSummary: summarizeSqlTimings(postgresDurations.summary),
      };

      await writeFile(MATRIX_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

      console.log(formatMatrixMetrics(metrics));
      console.log(formatSqlTimingSummary(report.sqlTimingSummary));
      console.log(`postgres raw log: ${POSTGRES_RAW_LOG_PATH}`);
      console.log(`postgres sql timings: ${POSTGRES_SQL_SUMMARY_PATH}`);
      console.log(`matrix report: ${MATRIX_REPORT_PATH}`);
    } finally {
      await setPostgresDurationLogging(false);
    }
  });
});

interface ListingMatrixSeedMeta {
  categoryId: string;
  products: number;
  variants: number;
  variantsPerProduct: {
    min: number;
    max: number;
  };
  categories: Array<{
    id: string;
    slug: string;
    productCount: number;
  }>;
  expected: {
    priceOnly: ListingMatrixExpectedTotal;
    optionOnly: ListingMatrixExpectedResult;
    optionAndPrice: ListingMatrixExpectedResult;
  };
}

interface ListingMatrixExpectedTotal {
  expectedTotalCount: number;
}

interface ListingMatrixExpectedResult {
  expectedTotalCount: number;
  expectedSelectedFacetCounts: Record<string, Record<string, number>>;
}

interface ListingMatrixFacetValue {
  id: string;
  count: number;
  selected: boolean;
}

interface ListingMatrixFacet {
  id: string;
  values: ListingMatrixFacetValue[];
}

interface ListingMatrixConnection {
  totalCount: number;
  edges: Array<{ node: { id: string } }>;
  pageInfo: {
    hasNextPage: boolean;
  };
  facets: ListingMatrixFacet[];
}

interface ListingMatrixRunMetric {
  name: string;
  elapsedMs: number;
  totalCount: number;
  edgeCount: number;
}

interface SqlTimingSummaryEntry {
  name: string;
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  runsMs: number[];
}

function expectSelectedFacetValues(
  facets: ListingMatrixFacet[],
  expectedCounts: Record<string, Record<string, number>>,
) {
  for (const [facetId, valueCounts] of Object.entries(expectedCounts)) {
    const facet = facets.find((candidate) => candidate.id === facetId);
    expect(facet, `facet ${facetId}`).toBeTruthy();

    for (const [valueId, count] of Object.entries(valueCounts)) {
      const value = facet?.values.find((candidate) => candidate.id === valueId);
      expect(value, `facet ${facetId} value ${valueId}`).toBeTruthy();
      expect(value?.selected, `selected ${facetId}:${valueId}`).toBe(true);
      expect(value?.count, `count ${facetId}:${valueId}`).toBe(count);
    }
  }
}

function expectNoSelectedFacetValues(facets: ListingMatrixFacet[]) {
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
    enabled
      ? 'ALTER SYSTEM SET log_min_duration_statement = 0'
      : 'ALTER SYSTEM RESET log_min_duration_statement',
    '-c',
    'SELECT pg_reload_conf()',
  ]);
}

async function readRecentPostgresDurations(since: string): Promise<{ summary: string }> {
  const { stdout } = await execFileAsync(
    'sh',
    ['-lc', `docker logs --since '${since}' shopana-e2e-postgres 2>&1`],
    { maxBuffer: 1024 * 1024 * 32 },
  );

  const entries = extractPostgresDurationEntries(stdout);
  const summary =
    entries.length > 0 ? entries.join('\n\n---\n\n') : 'No postgres duration statements found.';

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
    for (let offset = 1; index + offset < lines.length; offset++) {
      const nextLine = lines[index + offset];
      if (nextLine.includes('duration:')) {
        break;
      }

      entry.push(nextLine);
    }

    entries.push(entry.join('\n'));
  }

  return entries;
}

function summarizeSqlTimings(summary: string): SqlTimingSummaryEntry[] {
  const timings = new Map<string, number[]>();

  for (const entry of summary.split('\n\n---\n\n')) {
    if (!entry.includes('execute')) {
      continue;
    }

    const duration = entry.match(/duration: ([0-9.]+) ms\s+execute [^:]+:/);
    const comment = entry.match(/\/\*\s*([^*]+?)\s*\//);
    if (!duration || !comment) {
      continue;
    }

    const name = comment[1].trim();
    if (!name.startsWith('listing:')) {
      continue;
    }

    const existing = timings.get(name) ?? [];
    existing.push(Number(duration[1]));
    timings.set(name, existing);
  }

  return [...timings.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, runsMs]) => {
      const sum = runsMs.reduce((total, duration) => total + duration, 0);
      return {
        name,
        count: runsMs.length,
        avgMs: Number((sum / runsMs.length).toFixed(3)),
        minMs: Number(Math.min(...runsMs).toFixed(3)),
        maxMs: Number(Math.max(...runsMs).toFixed(3)),
        runsMs: runsMs.map((duration) => Number(duration.toFixed(3))),
      };
    });
}

function formatMatrixMetrics(metrics: ListingMatrixRunMetric[]): string {
  return [
    'listing matrix elapsed:',
    ...metrics.map(
      (metric) =>
        `${metric.name}: elapsed=${metric.elapsedMs}ms total=${metric.totalCount} edges=${metric.edgeCount}`,
    ),
  ].join('\n');
}

function formatSqlTimingSummary(summary: SqlTimingSummaryEntry[]): string {
  const lines = ['postgres listing SQL execute summary:'];

  for (const entry of summary) {
    lines.push(
      `${entry.name}: count=${entry.count} avg=${entry.avgMs}ms min=${entry.minMs}ms max=${entry.maxMs}ms runs=${entry.runsMs.join(',')}`,
    );
  }

  return lines.join('\n');
}
