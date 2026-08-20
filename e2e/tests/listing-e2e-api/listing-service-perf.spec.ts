import { execFile } from 'node:child_process';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';

const execFileAsync = promisify(execFile);

const PRODUCT_COUNT = 10_000;
const PAGE_SIZE = 20;
const QUERY_RUNS = 1;
const PRICE_FILTER = { min: 20_000, max: 60_000 } as const;
const LISTING_PERF_RESULTS_DIR = resolve(process.cwd(), 'test-results/listing-perf');
const LISTING_PERF_RESULT_PREFIX = 'price-facet-10k';
const SEED_META_PATH = resolve(LISTING_PERF_RESULTS_DIR, `${LISTING_PERF_RESULT_PREFIX}-seed.json`);
const POSTGRES_RAW_LOG_PATH = resolve(LISTING_PERF_RESULTS_DIR, `${LISTING_PERF_RESULT_PREFIX}-postgres.log`);
const POSTGRES_SQL_SUMMARY_PATH = resolve(LISTING_PERF_RESULTS_DIR, `${LISTING_PERF_RESULT_PREFIX}-postgres-sql.txt`);
const POSTGRES_COMPARISON_PATH = resolve(LISTING_PERF_RESULTS_DIR, `${LISTING_PERF_RESULT_PREFIX}-comparison.json`);
const POSTGRES_FULL_REPORT_PATH = resolve(LISTING_PERF_RESULTS_DIR, `${LISTING_PERF_RESULT_PREFIX}-full-report.txt`);
const EXPLAIN_ANALYZE_REPORT_PATH = resolve(LISTING_PERF_RESULTS_DIR, `${LISTING_PERF_RESULT_PREFIX}-explain-analyze.txt`);
const LISTING_SQL_BRANCHES = [
  'listing:page',
  'listing:totalCount',
  'listing:facetsWithCounts',
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

const SELECTED_FACETS = [
  { variantFacet: { facet: 'color', value: 'red' } },
  { variantFacet: { facet: 'color', value: 'blue' } },
  { variantFacet: { facet: 'material', value: 'cotton' } },
  { variantFacet: { facet: 'size', value: 'm' } },
  { variantFacet: { facet: 'size', value: 'l' } },
  { variantFacet: { facet: 'style', value: 'classic' } },
  { variantFacet: { facet: 'brand', value: 'acme' } },
  { variantFacet: { facet: 'brand', value: 'northline' } },
  { variantFacet: { facet: 'brand', value: 'urbanist' } },
  { variantFacet: { facet: 'fit', value: 'regular' } },
  { variantFacet: { facet: 'fit', value: 'slim' } },
  { variantFacet: { facet: 'season', value: 'spring' } },
  { variantFacet: { facet: 'season', value: 'summer' } },
  { variantFacet: { facet: 'season', value: 'autumn' } },
  { variantFacet: { facet: 'pattern', value: 'solid' } },
  { variantFacet: { facet: 'pattern', value: 'striped' } },
  { price: PRICE_FILTER },
] as const;

test.describe('Listing service perf', () => {
  test.describe.configure({ timeout: 900_000 });

  test('calls listing service for price sort and price filter with 8 OR facet groups on 10k products with 18 variants each', async ({
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
      const runMetrics: ListingPerfRunMetric[] = [];
      await removeIfExists(EXPLAIN_ANALYZE_REPORT_PATH);

      for (let run = 1; run <= QUERY_RUNS; run += 1) {
        const startedAt = performance.now();
        const response = await request.post(graphqlUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Store-Name': api.session.projectSlug,
            'X-Organization-Id': api.session.organizationId ?? '',
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

        runMetrics.push({ run, elapsedMs, branchTimings: {} });
      }

      const postgresDurations = await readRecentPostgresDurations(postgresLogsSince);
      const explainAnalyzeReport =
        (await readOptionalFile(EXPLAIN_ANALYZE_REPORT_PATH)) ??
        'EXPLAIN ANALYZE disabled. Set LISTING_FACET_COUNTS_PROFILE_ENABLED=true to generate this report.';
      const branchTimingRuns = extractBranchTimingRuns(postgresDurations.summary);
      const sqlTimingSummary = summarizeSqlTimings(postgresDurations.summary);
      for (const metric of runMetrics) {
        metric.branchTimings = Object.fromEntries(
          LISTING_SQL_BRANCHES.map((branch) => [branch, branchTimingRuns[branch]?.[metric.run - 1] ?? null]),
        );
      }

      const comparison = buildRunComparison(runMetrics);
      await writeFile(POSTGRES_COMPARISON_PATH, `${JSON.stringify(comparison, null, 2)}\n`);
      await writeFile(
        POSTGRES_FULL_REPORT_PATH,
        buildFullReport({
          comparison,
          sqlTimingSummary,
          explainAnalyzeReport,
          postgresSummary: postgresDurations.summary,
        }),
      );

      console.log(formatRunComparison(comparison));
      console.log(formatSqlTimingSummary(sqlTimingSummary));
      console.log(`postgres raw log: ${POSTGRES_RAW_LOG_PATH}`);
      console.log(`postgres sql timings: ${POSTGRES_SQL_SUMMARY_PATH}`);
      console.log(`explain analyze: ${EXPLAIN_ANALYZE_REPORT_PATH}`);
      console.log(`comparison: ${POSTGRES_COMPARISON_PATH}`);
      console.log(`full report: ${POSTGRES_FULL_REPORT_PATH}`);
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

interface ListingPerfRunMetric {
  run: number;
  elapsedMs: number;
  branchTimings: Partial<Record<(typeof LISTING_SQL_BRANCHES)[number], number | null>>;
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

async function removeIfExists(path: string) {
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
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

interface SqlTimingSummaryEntry {
  name: string;
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  runsMs: number[];
}

function summarizeSqlTimings(summary: string): SqlTimingSummaryEntry[] {
  const timings = new Map<string, number[]>();

  for (const entry of summary.split('\n\n---\n\n')) {
    if (!entry.includes('execute')) {
      continue;
    }

    const duration = entry.match(/duration: ([0-9.]+) ms\s+execute [^:]+:/);
    const comment = entry.match(/\/\*\s*([^*]+?)\s*\*\//);
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

function formatSqlTimingSummary(summary: SqlTimingSummaryEntry[]): string {
  const lines = ['postgres listing SQL execute summary:'];

  for (const entry of summary) {
    lines.push(
      `${entry.name}: count=${entry.count} avg=${entry.avgMs}ms min=${entry.minMs}ms max=${entry.maxMs}ms runs=${entry.runsMs.join(',')}`,
    );
  }

  return lines.join('\n');
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function buildFullReport(input: {
  comparison: ReturnType<typeof buildRunComparison>;
  sqlTimingSummary: SqlTimingSummaryEntry[];
  explainAnalyzeReport: string;
  postgresSummary: string;
}) {
  return [
    '# Listing service price facet 10k perf report',
    '',
    '## Run comparison',
    '',
    JSON.stringify(input.comparison, null, 2),
    '',
    '## SQL execute summary',
    '',
    formatSqlTimingSummary(input.sqlTimingSummary),
    '',
    '## EXPLAIN ANALYZE',
    '',
    input.explainAnalyzeReport,
    '',
    '## Full PostgreSQL duration SQL report',
    '',
    input.postgresSummary,
    '',
  ].join('\n');
}
