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
const PRICE_FILTER = { min: 20_000, max: 60_000 } as const;
const LISTING_PERF_RESULTS_DIR = resolve(process.cwd(), 'test-results/listing-perf');
const SEED_META_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'price-facet-10k-seed.json');
const POSTGRES_RAW_LOG_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'price-facet-10k-postgres.log');
const POSTGRES_SQL_SUMMARY_PATH = resolve(LISTING_PERF_RESULTS_DIR, 'price-facet-10k-postgres-sql.txt');

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

const SELECTED_FACETS = [
  { variantFacet: { facet: 'color', value: 'red' } },
  { variantFacet: { facet: 'color', value: 'blue' } },
  { variantFacet: { facet: 'color', value: 'green' } },
  { variantFacet: { facet: 'material', value: 'cotton' } },
  { variantFacet: { facet: 'material', value: 'linen' } },
  { variantFacet: { facet: 'size', value: 'm' } },
  { variantFacet: { facet: 'size', value: 'l' } },
  { variantFacet: { facet: 'size', value: 'xl' } },
  { variantFacet: { facet: 'style', value: 'classic' } },
  { variantFacet: { facet: 'style', value: 'modern' } },
  { price: PRICE_FILTER },
] as const;

test.describe('Listing service perf', () => {
  test.describe.configure({ timeout: 240_000 });

  test('calls listing service for price sort and price filter with 4 OR facet groups on 10k products', async ({
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
      const startedAt = performance.now();
      const response = await request.post(graphqlUrl, {
        headers: {
          'Content-Type': 'application/json',
          'X-Store-Name': api.session.projectSlug,
          'X-Organization-Id': api.session.organizationId ?? '',
          'X-Currency': 'USD',
          'X-Idempotency-Key': 'listing-service-perf-price-facets-10k',
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
            facets: SELECTED_FACETS,
            orderBy: {
              by: 'PRICE',
              direction: 'asc',
            },
          },
        },
      });
      const elapsedMs = performance.now() - startedAt;
      const json = await response.json();
      const postgresDurations = await readRecentPostgresDurations(postgresLogsSince);

      console.log(`listing service elapsed=${elapsedMs.toFixed(3)}ms`);
      console.log(`postgres raw log: ${POSTGRES_RAW_LOG_PATH}`);
      console.log(`postgres sql timings: ${POSTGRES_SQL_SUMMARY_PATH}`);
      console.log(postgresDurations.summary);

      expect(response.ok()).toBe(true);
      expect(json.errors ?? []).toEqual([]);
      const listing = json.data.listingQuery.listing;
      expect(listing.totalCount).toBe(seedMeta.expected.expectedTotalCount);
      expect(listing.edges.map((edge: ListingPerfEdge) => edge.node.id)).toEqual(
        seedMeta.expected.expectedPageProductIds,
      );
      expectSelectedFacetCounts(listing.facets, seedMeta.expected.expectedSelectedFacetCounts);
      expect(json.data.listingQuery.listing.edges).toHaveLength(PAGE_SIZE);
      expect(json.data.listingQuery.listing.pageInfo.hasNextPage).toBe(true);
    } finally {
      await setPostgresDurationLogging(false);
    }
  });
});

interface ListingPerfSeedMeta {
  expected: {
    expectedTotalCount: number;
    expectedPageProductIds: string[];
    expectedSelectedFacetCounts: Record<string, Record<string, number>>;
  };
}

interface ListingPerfEdge {
  node: {
    id: string;
  };
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

function expectSelectedFacetCounts(
  facets: ListingPerfFacet[],
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
