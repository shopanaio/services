import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:15432/portal';
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_PRODUCTS = 10_000;
const DEFAULT_PAGE_SIZE = 20;
const PRICE_FILTER_MIN_MINOR = 20_000;
const PRICE_FILTER_MAX_MINOR = 60_000;
const CURRENCY = 'USD';
const LOCALE = 'en';
const E2E_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const OPTION_GROUPS = [
  {
    slug: 'color',
    values: ['black', 'white', 'red', 'blue', 'green', 'yellow'],
    selected: ['red', 'blue', 'green'],
  },
  {
    slug: 'material',
    values: ['cotton', 'linen', 'wool', 'denim'],
    selected: ['cotton', 'linen'],
  },
  {
    slug: 'size',
    values: ['xs', 's', 'm', 'l', 'xl', 'xxl'],
    selected: ['m', 'l', 'xl'],
  },
  {
    slug: 'style',
    values: ['classic', 'modern', 'street', 'minimal', 'sport'],
    selected: ['classic', 'modern'],
  },
];

const emptyBitmapSql = `
  (
    SELECT rb_build_agg(empty_doc_id) - rb_build_agg(empty_doc_id)
    FROM (VALUES (0)) AS empty_bitmap_seed(empty_doc_id)
  )
`;

function parseArgs(argv) {
  const args = {
    products: DEFAULT_PRODUCTS,
    pageSize: DEFAULT_PAGE_SIZE,
    maxMs: null,
    projectId: null,
    categoryId: null,
    seedOnly: false,
    outDir: resolve(E2E_DIR, 'test-results/listing-perf'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--products' && next) {
      args.products = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--page-size' && next) {
      args.pageSize = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--max-ms' && next) {
      args.maxMs = Number.parseFloat(next);
      i += 1;
    } else if (arg === '--project-id' && next) {
      args.projectId = next;
      i += 1;
    } else if (arg === '--category-id' && next) {
      args.categoryId = next;
      i += 1;
    } else if (arg === '--seed-only') {
      args.seedOnly = true;
    } else if (arg === '--out-dir' && next) {
      args.outDir = resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!Number.isInteger(args.products) || args.products <= 0) {
    throw new Error('--products must be a positive integer');
  }
  if (!Number.isInteger(args.pageSize) || args.pageSize <= 0) {
    throw new Error('--page-size must be a positive integer');
  }
  if (args.maxMs !== null && (!Number.isFinite(args.maxMs) || args.maxMs <= 0)) {
    throw new Error('--max-ms must be a positive number');
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/listing-price-facet-perf.mjs [--products 10000] [--page-size 20] [--max-ms 100]
  node scripts/listing-price-facet-perf.mjs --seed-only --project-id <uuid> --category-id <uuid>

Environment:
  E2E_DATABASE_URL or DATABASE_URL, default ${DEFAULT_DATABASE_URL}

What it measures:
  Direct listing read-model SQL for category page price_asc sorting with 4 OPTION
  facet OR groups selected at once. It writes EXPLAIN ANALYZE JSON plans to
  test-results/listing-perf/.
`);
}

function optionValueForProduct(group, productIndex) {
  const value = group.values[productIndex % group.values.length];
  return typeof value === 'string' ? value : value.handle;
}

function optionSignatureKey(valueKeys) {
  return [...new Set(valueKeys)].sort().join('|');
}

function composeGlobalId(typeName, id) {
  return Buffer.from(`gid://shopana/${typeName}/${id}`, 'utf8').toString('base64');
}

function buildExpectedSeedMeta(input) {
  const selectedByFacet = new Map(input.facets.map((facet) => [facet.slug, new Set(facet.selected)]));
  const assignments = input.productIds.map((productId, index) => {
    const facetValues = Object.fromEntries(
      input.facets.map((facet) => [facet.slug, optionValueForProduct(facet, index)]),
    );

    return {
      productId,
      productGlobalId: composeGlobalId('Product', productId),
      productDocId: input.productDocIds[index],
      priceMinor: input.prices[index],
      facetValues,
    };
  });
  const matchesAllFilters = (assignment) =>
    assignment.priceMinor >= input.priceFilter.minMinor &&
    assignment.priceMinor <= input.priceFilter.maxMinor &&
    [...selectedByFacet.entries()].every(([facetSlug, selected]) => selected.has(assignment.facetValues[facetSlug]));
  const matchingAssignments = assignments.filter(matchesAllFilters);
  const sortedAssignments = [...matchingAssignments].sort(
    (left, right) => left.priceMinor - right.priceMinor || left.productId.localeCompare(right.productId),
  );
  const selectedFacetCounts = Object.fromEntries(
    input.facets.map((facet) => [
      facet.slug,
      Object.fromEntries(
        facet.selected.map((valueHandle) => [
          valueHandle,
          assignments.filter((assignment) => {
            if (assignment.facetValues[facet.slug] !== valueHandle) {
              return false;
            }
            if (
              assignment.priceMinor < input.priceFilter.minMinor ||
              assignment.priceMinor > input.priceFilter.maxMinor
            ) {
              return false;
            }

            return input.facets
              .filter((otherFacet) => otherFacet.slug !== facet.slug)
              .every((otherFacet) => selectedByFacet.get(otherFacet.slug)?.has(assignment.facetValues[otherFacet.slug]));
          }).length,
        ]),
      ),
    ]),
  );

  return {
    expectedTotalCount: matchingAssignments.length,
    expectedPageProductIds: sortedAssignments.slice(0, input.pageSize).map((assignment) => assignment.productGlobalId),
    expectedPageProductDocIds: sortedAssignments.slice(0, input.pageSize).map((assignment) => assignment.productDocId),
    expectedSelectedFacetCounts: selectedFacetCounts,
  };
}

function planMetric(plan, metric) {
  const root = Array.isArray(plan) ? plan[0] : plan;
  return Number(root?.[metric] ?? 0);
}

function collectBufferSummary(node, summary = { hit: 0, read: 0, dirtied: 0, written: 0 }) {
  if (!node || typeof node !== 'object') {
    return summary;
  }

  summary.hit += Number(node['Shared Hit Blocks'] ?? 0);
  summary.read += Number(node['Shared Read Blocks'] ?? 0);
  summary.dirtied += Number(node['Shared Dirtied Blocks'] ?? 0);
  summary.written += Number(node['Shared Written Blocks'] ?? 0);

  for (const child of node.Plans ?? []) {
    collectBufferSummary(child, summary);
  }

  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = postgres(process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, {
    max: 1,
  });

  const projectId = args.projectId ?? randomUUID();
  const categoryId = args.categoryId ?? randomUUID();
  const productIds = Array.from({ length: args.products }, () => randomUUID());
  const variantIds = Array.from({ length: args.products }, () => randomUUID());
  const productDocIds = Array.from({ length: args.products }, (_, index) => index + 1);
  const handles = productDocIds.map((docId) => `perf-product-${docId.toString().padStart(5, '0')}`);
  const prices = productDocIds.map((docId) => 1_000 + ((docId * 37) % 90_000));
  const now = new Date().toISOString();

  const facets = OPTION_GROUPS.map((group, groupIndex) => ({
    ...group,
    id: randomUUID(),
    values: group.values.map((handle, valueIndex) => ({
      id: randomUUID(),
      handle,
    })),
  }));

  const productValueKeys = productDocIds.map((docId, index) => {
    return facets.map((facet) => {
      const valueHandle = optionValueForProduct(facet, index);
      const value = facet.values.find((candidate) => candidate.handle === valueHandle);
      return `${facet.id}:${value.id}`;
    });
  });
  const signatureKeys = productValueKeys.map(optionSignatureKey);
  const selectedFilterRows = facets.flatMap((facet) =>
    facet.selected.map((handle) => {
      const value = facet.values.find((candidate) => candidate.handle === handle);
      return { facetId: facet.id, valueKey: `${facet.id}:${value.id}` };
    }),
  );
  const expected = buildExpectedSeedMeta({
    facets,
    productIds,
    productDocIds,
    prices,
    pageSize: args.pageSize,
    priceFilter: {
      minMinor: PRICE_FILTER_MIN_MINOR,
      maxMinor: PRICE_FILTER_MAX_MINOR,
    },
  });

  await sql.begin(async (tx) => {
    await seedCatalogFacets(tx, projectId, facets);
    await seedListingRows(tx, {
      projectId,
      categoryId,
      productIds,
      variantIds,
      productDocIds,
      handles,
      prices,
      signatureKeys,
      now,
    });
    await seedCategoryBitmap(tx, projectId, categoryId, productDocIds);
    await seedVariantProjectionBlock(tx, projectId, productDocIds);
    await seedOptionFacetBitmaps(tx, projectId, facets, productValueKeys, productDocIds);
    await seedOptionSignatures(tx, projectId, productValueKeys, productDocIds);
  });

  await sql`ANALYZE listing.product_listing_index`;
  await sql`ANALYZE listing.variant_listing_index`;
  await sql`ANALYZE listing.variant_listing_price_index`;
  await sql`ANALYZE listing.listing_posting_bitmap`;
  await sql`ANALYZE listing.listing_posting_variant_projection_block`;
  await sql`ANALYZE listing.listing_option_signature`;
  await sql`ANALYZE listing.listing_option_signature_value`;
  await sql`ANALYZE listing.listing_option_signature_product_membership`;

  if (args.seedOnly) {
    await writeText(
      args.outDir,
      'price-facet-10k-seed.json',
      `${JSON.stringify(
        {
          projectId,
          categoryId,
          products: args.products,
          pageSize: args.pageSize,
          filters: OPTION_GROUPS.map(({ slug, selected }) => ({ slug, selected })),
          priceFilter: {
            minMinor: PRICE_FILTER_MIN_MINOR,
            maxMinor: PRICE_FILTER_MAX_MINOR,
          },
          expected,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`seeded project=${projectId} category=${categoryId} products=${args.products}`);
    console.log(
      `filters=${selectedFilterRows.length} values across ${facets.length} OR groups price=${PRICE_FILTER_MIN_MINOR}-${PRICE_FILTER_MAX_MINOR}`,
    );
    console.log(`seedMeta=${resolve(args.outDir, 'price-facet-10k-seed.json')}`);
    await sql.end();
    return;
  }

  const pageInput = {
    projectId,
    categoryId,
    pageSize: args.pageSize,
    selectedFilterRows,
  };
  const totalInput = {
    projectId,
    categoryId,
    selectedFilterRows,
  };
  const pageSql = buildPageSelectSql(pageInput);
  const totalSql = buildTotalSelectSql(totalInput);

  const pageSelect = await measureQuery(() => runPageSelect(sql, pageSql));
  const totalSelect = await measureQuery(() => runTotalSelect(sql, totalSql));
  const pagePlan = await runPageExplain(sql, pageInput);
  const totalPlan = await runTotalExplain(sql, totalInput);

  await writeText(args.outDir, 'price-facet-10k-page.sql', pageSql);
  await writeText(args.outDir, 'price-facet-10k-total.sql', totalSql);
  await writePlan(args.outDir, 'price-facet-10k-page.json', pagePlan);
  await writePlan(args.outDir, 'price-facet-10k-total.json', totalPlan);

  const pageExecutionMs = planMetric(pagePlan, 'Execution Time');
  const totalExecutionMs = planMetric(totalPlan, 'Execution Time');
  const pageBuffers = collectBufferSummary(pagePlan[0].Plan);

  console.log(`seeded project=${projectId} category=${categoryId} products=${args.products}`);
  console.log(`filters=${selectedFilterRows.length} values across ${facets.length} OR groups`);
  console.log(`page select rows=${pageSelect.result.length} clientElapsed=${pageSelect.elapsedMs.toFixed(3)}ms`);
  console.log(`total select rows=${totalSelect.result.length} total=${totalSelect.result[0]?.total_count ?? totalSelect.result[0]?.totalCount ?? 'n/a'} clientElapsed=${totalSelect.elapsedMs.toFixed(3)}ms`);
  console.log(`page explain execution=${pageExecutionMs.toFixed(3)}ms planning=${planMetric(pagePlan, 'Planning Time').toFixed(3)}ms`);
  console.log(`total explain execution=${totalExecutionMs.toFixed(3)}ms planning=${planMetric(totalPlan, 'Planning Time').toFixed(3)}ms`);
  console.log(`page shared blocks hit=${pageBuffers.hit} read=${pageBuffers.read} dirtied=${pageBuffers.dirtied} written=${pageBuffers.written}`);
  console.log(`plans=${args.outDir}`);

  await sql.end();

  if (args.maxMs !== null && pageSelect.elapsedMs > args.maxMs) {
    throw new Error(`page select ${pageSelect.elapsedMs.toFixed(3)}ms exceeded --max-ms ${args.maxMs}`);
  }
}

async function measureQuery(callback) {
  const startedAt = performance.now();
  const result = await callback();
  return {
    result,
    elapsedMs: performance.now() - startedAt,
  };
}

async function seedCatalogFacets(sql, projectId, facets) {
  for (const [facetIndex, facet] of facets.entries()) {
    await sql`
      INSERT INTO catalog.facet (
        id,
        project_id,
        facet_type,
        ui_type,
        selection_mode,
        lexo_rank,
        slug,
        created_at,
        updated_at
      )
      VALUES (
        ${facet.id}::uuid,
        ${projectId}::uuid,
        'OPTION',
        'checkbox',
        'multi',
        ${String(facetIndex + 1).padStart(8, '0')},
        ${facet.slug},
        now(),
        now()
      )
      ON CONFLICT (project_id, slug) DO NOTHING
    `;
    await sql`
      INSERT INTO catalog.facet_translation (facet_id, locale, project_id, label)
      VALUES (${facet.id}::uuid, ${LOCALE}, ${projectId}::uuid, ${facet.slug})
      ON CONFLICT (facet_id, locale) DO UPDATE SET label = EXCLUDED.label
    `;

    for (const [valueIndex, value] of facet.values.entries()) {
      await sql`
        INSERT INTO catalog.facet_value (
          id,
          project_id,
          facet_id,
          kind,
          handle,
          sort_index,
          enabled,
          created_at,
          updated_at
        )
        VALUES (
          ${value.id}::uuid,
          ${projectId}::uuid,
          ${facet.id}::uuid,
          'display',
          ${value.handle},
          ${valueIndex},
          true,
          now(),
          now()
        )
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO catalog.facet_value_translation (
          facet_value_id,
          locale,
          project_id,
          label
        )
        VALUES (${value.id}::uuid, ${LOCALE}, ${projectId}::uuid, ${value.handle})
        ON CONFLICT (facet_value_id, locale) DO UPDATE SET label = EXCLUDED.label
      `;
    }
  }
}

async function seedListingRows(sql, input) {
  await sql`
    INSERT INTO listing.product_listing_index (
      project_id,
      product_id,
      product_doc_id,
      kind,
      handle,
      status,
      published_at,
      product_created_at,
      product_updated_at,
      product_revision,
      in_stock,
      total_stock,
      indexed_at,
      updated_at
    )
    SELECT
      ${input.projectId}::uuid,
      product_id,
      product_doc_id,
      'BASE',
      handle,
      'published',
      ${input.now}::timestamptz,
      ${input.now}::timestamptz,
      ${input.now}::timestamptz,
      1,
      true,
      1,
      now(),
      now()
    FROM unnest(
      ${input.productIds}::uuid[],
      ${input.productDocIds}::int[],
      ${input.handles}::text[]
    ) AS rows(product_id, product_doc_id, handle)
  `;

  await sql`
    INSERT INTO listing.variant_listing_index (
      project_id,
      product_id,
      product_doc_id,
      variant_id,
      variant_doc_id,
      signature_key,
      in_stock,
      total_stock,
      indexed_at,
      updated_at
    )
    SELECT
      ${input.projectId}::uuid,
      product_id,
      product_doc_id,
      variant_id,
      product_doc_id,
      signature_key,
      true,
      1,
      now(),
      now()
    FROM unnest(
      ${input.productIds}::uuid[],
      ${input.productDocIds}::int[],
      ${input.variantIds}::uuid[],
      ${input.signatureKeys}::text[]
    ) AS rows(product_id, product_doc_id, variant_id, signature_key)
  `;

  await sql`
    INSERT INTO listing.variant_listing_price_index (
      project_id,
      variant_id,
      currency,
      variant_doc_id,
      product_doc_id,
      product_id,
      signature_key,
      price_minor,
      has_price,
      indexed_at,
      updated_at
    )
    SELECT
      ${input.projectId}::uuid,
      variant_id,
      ${CURRENCY},
      product_doc_id,
      product_doc_id,
      product_id,
      signature_key,
      price_minor,
      true,
      now(),
      now()
    FROM unnest(
      ${input.productIds}::uuid[],
      ${input.productDocIds}::int[],
      ${input.variantIds}::uuid[],
      ${input.signatureKeys}::text[],
      ${input.prices}::bigint[]
    ) AS rows(product_id, product_doc_id, variant_id, signature_key, price_minor)
  `;

  await sql`
    INSERT INTO listing.product_listing_price_index (
      project_id,
      product_id,
      currency,
      min_price_minor,
      max_price_minor,
      has_price,
      indexed_at,
      updated_at
    )
    SELECT
      ${input.projectId}::uuid,
      product_id,
      ${CURRENCY},
      price_minor,
      price_minor,
      true,
      now(),
      now()
    FROM unnest(
      ${input.productIds}::uuid[],
      ${input.prices}::bigint[]
    ) AS rows(product_id, price_minor)
  `;

  await sql`
    INSERT INTO listing.listing_posting_product_sort (
      project_id,
      product_doc_id,
      product_id,
      sort_kind,
      locale,
      currency,
      manual_scope_id,
      bool_value,
      bigint_value
    )
    SELECT
      ${input.projectId}::uuid,
      product_doc_id,
      product_id,
      'price_asc',
      '',
      ${CURRENCY},
      ${ZERO_UUID}::uuid,
      true,
      price_minor
    FROM unnest(
      ${input.productIds}::uuid[],
      ${input.productDocIds}::int[],
      ${input.prices}::bigint[]
    ) AS rows(product_id, product_doc_id, price_minor)
  `;
}

async function seedCategoryBitmap(sql, projectId, categoryId, productDocIds) {
  await sql`
    WITH docs AS (
      SELECT unnest(${productDocIds}::int[]) AS doc_id
    ),
    bitmap AS (
      SELECT rb_build_agg(doc_id) AS value
      FROM docs
    )
    INSERT INTO listing.listing_posting_bitmap (
      project_id,
      entity_type,
      field,
      value_key,
      bitmap,
      cardinality,
      metadata,
      updated_at
    )
    SELECT
      ${projectId}::uuid,
      'product',
      'category',
      ${categoryId},
      value,
      rb_cardinality(value),
      '{}'::jsonb,
      now()
    FROM bitmap
  `;
}

async function seedVariantProjectionBlock(sql, projectId, productDocIds) {
  await sql`
    WITH docs AS (
      SELECT unnest(${productDocIds}::int[]) AS doc_id
    ),
    bitmap AS (
      SELECT rb_build_agg(doc_id) AS value
      FROM docs
    )
    INSERT INTO listing.listing_posting_variant_projection_block (
      project_id,
      block_id,
      variant_doc_from,
      variant_doc_to,
      variant_bitmap,
      product_bitmap,
      variant_count,
      product_count
    )
    SELECT
      ${projectId}::uuid,
      0,
      1,
      ${productDocIds.length + 1},
      value,
      value,
      rb_cardinality(value)::int,
      rb_cardinality(value)::int
    FROM bitmap
  `;
}

async function seedOptionFacetBitmaps(sql, projectId, facets, productValueKeys, productDocIds) {
  const grouped = new Map();

  for (const [productIndex, valueKeys] of productValueKeys.entries()) {
    for (const valueKey of valueKeys) {
      const docIds = grouped.get(valueKey) ?? [];
      docIds.push(productDocIds[productIndex]);
      grouped.set(valueKey, docIds);
    }
  }

  for (const facet of facets) {
    for (const value of facet.values) {
      const valueKey = `${facet.id}:${value.id}`;
      const docIds = grouped.get(valueKey) ?? [];

      await sql`
        WITH docs AS (
          SELECT unnest(${docIds}::int[]) AS doc_id
        ),
        bitmap AS (
          SELECT COALESCE(rb_build_agg(doc_id), ${sql.unsafe(emptyBitmapSql)}) AS value
          FROM docs
        )
        INSERT INTO listing.listing_posting_bitmap (
          project_id,
          entity_type,
          field,
          value_key,
          bitmap,
          cardinality,
          metadata,
          updated_at
        )
        SELECT
          ${projectId}::uuid,
          'variant',
          'facet',
          ${valueKey},
          value,
          rb_cardinality(value),
          '{}'::jsonb,
          now()
        FROM bitmap
      `;
    }
  }
}

async function seedOptionSignatures(sql, projectId, productValueKeys, productDocIds) {
  const groups = new Map();

  for (const [productIndex, valueKeys] of productValueKeys.entries()) {
    const signatureKey = optionSignatureKey(valueKeys);
    const group = groups.get(signatureKey) ?? { valueKeys, productDocIds: [] };
    group.productDocIds.push(productDocIds[productIndex]);
    groups.set(signatureKey, group);
  }

  for (const [signatureKey, group] of groups.entries()) {
    const optionSignatureId = randomUUID();
    const facetIds = group.valueKeys.map((valueKey) => valueKey.split(':')[0]);

    await sql`
      WITH docs AS (
        SELECT unnest(${group.productDocIds}::int[]) AS doc_id
      ),
      bitmap AS (
        SELECT rb_build_agg(doc_id) AS value
        FROM docs
      )
      INSERT INTO listing.listing_option_signature (
        option_signature_id,
        project_id,
        signature_key,
        option_value_count,
        product_bitmap,
        cardinality,
        metadata,
        updated_at
      )
      SELECT
        ${optionSignatureId}::uuid,
        ${projectId}::uuid,
        ${signatureKey},
        ${group.valueKeys.length},
        value,
        rb_cardinality(value),
        '{}'::jsonb,
        now()
      FROM bitmap
    `;

    await sql`
      INSERT INTO listing.listing_option_signature_value (
        option_signature_id,
        project_id,
        signature_key,
        facet_id,
        value_key
      )
      SELECT
        ${optionSignatureId}::uuid,
        ${projectId}::uuid,
        ${signatureKey},
        facet_id,
        value_key
      FROM unnest(
        ${facetIds}::uuid[],
        ${group.valueKeys}::text[]
      ) AS rows(facet_id, value_key)
    `;

    await sql`
      INSERT INTO listing.listing_option_signature_product_membership (
        option_signature_id,
        project_id,
        signature_key,
        product_doc_id,
        variant_count,
        updated_at
      )
      SELECT
        ${optionSignatureId}::uuid,
        ${projectId}::uuid,
        ${signatureKey},
        product_doc_id,
        1,
        now()
      FROM unnest(${group.productDocIds}::int[]) AS rows(product_doc_id)
    `;
  }
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function uuidArraySql(values) {
  return `ARRAY[${values.map((value) => `${sqlLiteral(value)}::uuid`).join(', ')}]`;
}

function textArraySql(values) {
  return `ARRAY[${values.map(sqlLiteral).join(', ')}]::text[]`;
}

function selectedFilterArrays(input) {
  return {
    facetIds: uuidArraySql(input.selectedFilterRows.map((row) => row.facetId)),
    valueKeys: textArraySql(input.selectedFilterRows.map((row) => row.valueKey)),
  };
}

async function runPageSelect(sql, query) {
  return sql.unsafe(query);
}

async function runTotalSelect(sql, query) {
  return sql.unsafe(query);
}

function buildPageSelectSql(input) {
  const { facetIds, valueKeys } = selectedFilterArrays(input);

  return `
    /* listing-price-facet-perf actual-page */
    WITH
    input AS (
      SELECT
        ${sqlLiteral(input.projectId)}::uuid AS project_id,
        ${sqlLiteral(input.categoryId)}::text AS category_value_key,
        ${sqlLiteral(CURRENCY)}::text AS currency,
        ${input.pageSize}::int AS first
    ),
    selected_filter_values AS (
      SELECT *
      FROM unnest(${facetIds}, ${valueKeys}) AS rows(facet_id, value_key)
    ),
    option_filter_groups AS (
      SELECT
        sfv.facet_id::text AS facet_id,
        COALESCE(rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL), ${emptyBitmapSql}) AS bitmap
      FROM selected_filter_values sfv
      JOIN input i ON true
      LEFT JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = sfv.value_key
      GROUP BY sfv.facet_id
    ),
    in_stock_variants AS (
      SELECT COALESCE(rb_build_agg(vli.variant_doc_id), ${emptyBitmapSql}) AS bitmap
      FROM listing.variant_listing_index vli
      JOIN input i ON true
      WHERE vli.project_id = i.project_id
        AND vli.in_stock = true
    ),
    variant_filters AS (
      SELECT rb_and_agg(bitmap) AS bitmap
      FROM (
        SELECT bitmap FROM option_filter_groups
        UNION ALL
        SELECT bitmap FROM in_stock_variants
      ) x
    ),
    raw_scope_products AS (
      SELECT COALESCE((
        SELECT p.bitmap
        FROM listing.listing_posting_bitmap p
        JOIN input i ON true
        WHERE p.project_id = i.project_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${emptyBitmapSql}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${emptyBitmapSql}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.project_id = i.project_id
        AND pli.status = 'published'
    ),
    projected_variant_products AS (
      SELECT COALESCE((
        WITH matched_blocks AS (
          SELECT
            b.variant_doc_from,
            b.variant_doc_to,
            b.variant_bitmap,
            b.product_bitmap,
            b.variant_count,
            ((SELECT bitmap FROM variant_filters) & b.variant_bitmap) AS block_match
          FROM listing.listing_posting_variant_projection_block b
          JOIN input i ON true
          WHERE b.project_id = i.project_id
            AND rb_cardinality((SELECT bitmap FROM variant_filters) & b.variant_bitmap) > 0
        ),
        full_block_products AS (
          SELECT mb.product_bitmap
          FROM matched_blocks mb
          WHERE rb_cardinality(mb.block_match) = mb.variant_count
        ),
        partial_block_products AS (
          SELECT rb_build_agg(vli.product_doc_id) AS product_bitmap
          FROM matched_blocks mb
          JOIN input i ON true
          JOIN listing.variant_listing_index vli
            ON vli.project_id = i.project_id
           AND vli.variant_doc_id >= mb.variant_doc_from
           AND vli.variant_doc_id < mb.variant_doc_to
          WHERE rb_cardinality(mb.block_match) < mb.variant_count
            AND mb.block_match @> vli.variant_doc_id
        ),
        projected AS (
          SELECT rb_or_agg(product_bitmap) AS product_bitmap
          FROM (
            SELECT product_bitmap FROM full_block_products
            UNION ALL
            SELECT product_bitmap FROM partial_block_products
          ) x
        )
        SELECT product_bitmap
        FROM projected
      ), ${emptyBitmapSql}) AS bitmap
    ),
    matches AS (
      SELECT rsp.bitmap & pp.bitmap & pvp.bitmap AS bitmap
      FROM raw_scope_products rsp
      CROSS JOIN published_products pp
      CROSS JOIN projected_variant_products pvp
    ),
    variant_price_candidates AS (
      SELECT
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM listing.variant_listing_price_index vp
      JOIN listing.variant_listing_index vli
        ON vli.project_id = vp.project_id
       AND vli.variant_id = vp.variant_id
       AND vli.in_stock = true
      JOIN input i ON true
      CROSS JOIN matches m
      CROSS JOIN variant_filters vf
      WHERE vp.project_id = i.project_id
        AND vp.currency = i.currency
        AND vp.has_price = true
        AND vp.price_minor IS NOT NULL
        AND vf.bitmap @> vp.variant_doc_id
        AND m.bitmap @> vp.product_doc_id
    ),
    variant_price_chosen AS (
      SELECT DISTINCT ON (vp.product_id)
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM variant_price_candidates vp
      ORDER BY vp.product_id ASC, vp.price_minor ASC NULLS LAST, vp.variant_doc_id ASC
    ),
    variant_price_ordered AS (
      SELECT
        chosen.product_doc_id,
        chosen.product_id,
        chosen.variant_doc_id,
        chosen.price_minor
      FROM variant_price_chosen chosen
      JOIN input i ON true
      JOIN listing.product_listing_index pli
        ON pli.project_id = i.project_id
       AND pli.product_doc_id = chosen.product_doc_id
       AND pli.product_id = chosen.product_id
      ORDER BY pli.in_stock DESC, chosen.price_minor ASC NULLS LAST, chosen.product_id ASC
      LIMIT (SELECT first + 1 FROM input)
    )
    SELECT *
    FROM variant_price_ordered
  `;
}

function buildTotalSelectSql(input) {
  const { facetIds, valueKeys } = selectedFilterArrays(input);

  return `
    /* listing-price-facet-perf actual-total */
    WITH
    input AS (
      SELECT
        ${sqlLiteral(input.projectId)}::uuid AS project_id,
        ${sqlLiteral(input.categoryId)}::text AS category_value_key
    ),
    selected_filter_values AS (
      SELECT *
      FROM unnest(${facetIds}, ${valueKeys}) AS rows(facet_id, value_key)
    ),
    option_filter_groups AS (
      SELECT
        sfv.facet_id::text AS facet_id,
        COALESCE(rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL), ${emptyBitmapSql}) AS bitmap
      FROM selected_filter_values sfv
      JOIN input i ON true
      LEFT JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = sfv.value_key
      GROUP BY sfv.facet_id
    ),
    variant_filters AS (
      SELECT rb_and_agg(bitmap) AS bitmap
      FROM option_filter_groups
    ),
    scope_products AS (
      SELECT COALESCE((
        SELECT p.bitmap
        FROM listing.listing_posting_bitmap p
        JOIN input i ON true
        WHERE p.project_id = i.project_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${emptyBitmapSql}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${emptyBitmapSql}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.project_id = i.project_id
        AND pli.status = 'published'
    ),
    matches AS (
      SELECT sp.bitmap & pp.bitmap & vf.bitmap AS bitmap
      FROM scope_products sp
      CROSS JOIN published_products pp
      CROSS JOIN variant_filters vf
    )
    SELECT rb_cardinality(bitmap)::int AS total_count
    FROM matches
  `;
}

async function runPageExplain(sql, input) {
  const facetIds = input.selectedFilterRows.map((row) => row.facetId);
  const valueKeys = input.selectedFilterRows.map((row) => row.valueKey);

  const rows = await sql`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    WITH
    input AS (
      SELECT
        ${input.projectId}::uuid AS project_id,
        ${input.categoryId}::text AS category_value_key,
        ${CURRENCY}::text AS currency,
        ${input.pageSize}::int AS first
    ),
    selected_filter_values AS (
      SELECT *
      FROM unnest(${facetIds}::uuid[], ${valueKeys}::text[]) AS rows(facet_id, value_key)
    ),
    option_filter_groups AS (
      SELECT
        sfv.facet_id::text AS facet_id,
        COALESCE(rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM selected_filter_values sfv
      JOIN input i ON true
      LEFT JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = sfv.value_key
      GROUP BY sfv.facet_id
    ),
    in_stock_variants AS (
      SELECT COALESCE(rb_build_agg(vli.variant_doc_id), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM listing.variant_listing_index vli
      JOIN input i ON true
      WHERE vli.project_id = i.project_id
        AND vli.in_stock = true
    ),
    variant_filters AS (
      SELECT rb_and_agg(bitmap) AS bitmap
      FROM (
        SELECT bitmap FROM option_filter_groups
        UNION ALL
        SELECT bitmap FROM in_stock_variants
      ) x
    ),
    raw_scope_products AS (
      SELECT COALESCE((
        SELECT p.bitmap
        FROM listing.listing_posting_bitmap p
        JOIN input i ON true
        WHERE p.project_id = i.project_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.project_id = i.project_id
        AND pli.status = 'published'
    ),
    projected_variant_products AS (
      SELECT COALESCE((
        WITH matched_blocks AS (
          SELECT
            b.variant_doc_from,
            b.variant_doc_to,
            b.variant_bitmap,
            b.product_bitmap,
            b.variant_count,
            ((SELECT bitmap FROM variant_filters) & b.variant_bitmap) AS block_match
          FROM listing.listing_posting_variant_projection_block b
          JOIN input i ON true
          WHERE b.project_id = i.project_id
            AND rb_cardinality((SELECT bitmap FROM variant_filters) & b.variant_bitmap) > 0
        ),
        full_block_products AS (
          SELECT mb.product_bitmap
          FROM matched_blocks mb
          WHERE rb_cardinality(mb.block_match) = mb.variant_count
        ),
        partial_block_products AS (
          SELECT rb_build_agg(vli.product_doc_id) AS product_bitmap
          FROM matched_blocks mb
          JOIN input i ON true
          JOIN listing.variant_listing_index vli
            ON vli.project_id = i.project_id
           AND vli.variant_doc_id >= mb.variant_doc_from
           AND vli.variant_doc_id < mb.variant_doc_to
          WHERE rb_cardinality(mb.block_match) < mb.variant_count
            AND mb.block_match @> vli.variant_doc_id
        ),
        projected AS (
          SELECT rb_or_agg(product_bitmap) AS product_bitmap
          FROM (
            SELECT product_bitmap FROM full_block_products
            UNION ALL
            SELECT product_bitmap FROM partial_block_products
          ) x
        )
        SELECT product_bitmap
        FROM projected
      ), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
    ),
    matches AS (
      SELECT rsp.bitmap & pp.bitmap & pvp.bitmap AS bitmap
      FROM raw_scope_products rsp
      CROSS JOIN published_products pp
      CROSS JOIN projected_variant_products pvp
    ),
    variant_price_candidates AS (
      SELECT
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM listing.variant_listing_price_index vp
      JOIN listing.variant_listing_index vli
        ON vli.project_id = vp.project_id
       AND vli.variant_id = vp.variant_id
       AND vli.in_stock = true
      JOIN input i ON true
      CROSS JOIN matches m
      CROSS JOIN variant_filters vf
      WHERE vp.project_id = i.project_id
        AND vp.currency = i.currency
        AND vp.has_price = true
        AND vp.price_minor IS NOT NULL
        AND vf.bitmap @> vp.variant_doc_id
        AND m.bitmap @> vp.product_doc_id
    ),
    variant_price_chosen AS (
      SELECT DISTINCT ON (vp.product_id)
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM variant_price_candidates vp
      ORDER BY vp.product_id ASC, vp.price_minor ASC NULLS LAST, vp.variant_doc_id ASC
    ),
    variant_price_ordered AS (
      SELECT
        chosen.product_doc_id,
        chosen.product_id,
        chosen.variant_doc_id,
        chosen.price_minor
      FROM variant_price_chosen chosen
      JOIN input i ON true
      JOIN listing.product_listing_index pli
        ON pli.project_id = i.project_id
       AND pli.product_doc_id = chosen.product_doc_id
       AND pli.product_id = chosen.product_id
      ORDER BY pli.in_stock DESC, chosen.price_minor ASC NULLS LAST, chosen.product_id ASC
      LIMIT (SELECT first + 1 FROM input)
    )
    SELECT *
    FROM variant_price_ordered
  `;

  return rows[0]['QUERY PLAN'];
}

async function runTotalExplain(sql, input) {
  const facetIds = input.selectedFilterRows.map((row) => row.facetId);
  const valueKeys = input.selectedFilterRows.map((row) => row.valueKey);

  const rows = await sql`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    WITH
    input AS (
      SELECT
        ${input.projectId}::uuid AS project_id,
        ${input.categoryId}::text AS category_value_key
    ),
    selected_filter_values AS (
      SELECT *
      FROM unnest(${facetIds}::uuid[], ${valueKeys}::text[]) AS rows(facet_id, value_key)
    ),
    option_filter_groups AS (
      SELECT
        sfv.facet_id::text AS facet_id,
        COALESCE(rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM selected_filter_values sfv
      JOIN input i ON true
      LEFT JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = sfv.value_key
      GROUP BY sfv.facet_id
    ),
    variant_filters AS (
      SELECT rb_and_agg(bitmap) AS bitmap
      FROM option_filter_groups
    ),
    scope_products AS (
      SELECT COALESCE((
        SELECT p.bitmap
        FROM listing.listing_posting_bitmap p
        JOIN input i ON true
        WHERE p.project_id = i.project_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.project_id = i.project_id
        AND pli.status = 'published'
    ),
    matches AS (
      SELECT sp.bitmap & pp.bitmap & vf.bitmap AS bitmap
      FROM scope_products sp
      CROSS JOIN published_products pp
      CROSS JOIN variant_filters vf
    )
    SELECT rb_cardinality(bitmap)::int AS total_count
    FROM matches
  `;

  return rows[0]['QUERY PLAN'];
}

async function writePlan(outDir, filename, plan) {
  await writeText(outDir, filename, `${JSON.stringify(plan, null, 2)}\n`);
}

async function writeText(outDir, filename, content) {
  const outputPath = resolve(outDir, filename);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
