import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:15432/portal';
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_PRODUCTS = 10_000;
const COMBINATION_OPTION_GROUP_COUNT = 4;
const DEFAULT_PAGE_SIZE = 20;
const PRICE_FILTER_MIN_MINOR = 20_000;
const PRICE_FILTER_MAX_MINOR = 60_000;
const CURRENCY = 'USD';
const LOCALE = 'en';
const E2E_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESULT_PREFIX = 'price-facet-10k';
const VARIANT_INSERT_CHUNK_SIZE = 100_000;
const CATALOG_INSERT_CHUNK_SIZE = 100_000;
const VARIANT_OPTION_LINK_INSERT_CHUNK_SIZE = 10_000;
const VARIANT_PROJECTION_BLOCK_SIZE = 3_600;

function allExceptLast(values) {
  return values.slice(0, -1);
}

const OPTION_GROUPS = [
  {
    slug: 'color',
    values: ['red', 'blue', 'green'],
    selected: allExceptLast(['red', 'blue', 'green']),
  },
  {
    slug: 'material',
    values: ['cotton', 'linen'],
    selected: allExceptLast(['cotton', 'linen']),
  },
  {
    slug: 'size',
    values: ['m', 'l', 'xl'],
    selected: allExceptLast(['m', 'l', 'xl']),
  },
  {
    slug: 'style',
    values: ['classic', 'modern'],
    selected: allExceptLast(['classic', 'modern']),
    valuesPerProduct: 1,
  },
  {
    slug: 'brand',
    values: ['acme', 'northline', 'urbanist', 'everfit'],
    selected: allExceptLast(['acme', 'northline', 'urbanist', 'everfit']),
  },
  {
    slug: 'fit',
    values: ['regular', 'slim', 'relaxed'],
    selected: allExceptLast(['regular', 'slim', 'relaxed']),
  },
  {
    slug: 'season',
    values: ['spring', 'summer', 'autumn', 'winter'],
    selected: allExceptLast(['spring', 'summer', 'autumn', 'winter']),
  },
  {
    slug: 'pattern',
    values: ['solid', 'striped', 'checked'],
    selected: allExceptLast(['solid', 'striped', 'checked']),
  },
];

const CATEGORY_SPECS = [
  {
    slug: 'large-mixed-catalog',
    includes: (docId) => docId % 5 !== 0,
  },
  {
    slug: 'every-second-product',
    includes: (docId) => docId % 2 === 0,
  },
  {
    slug: 'every-third-product',
    includes: (docId) => docId % 3 === 0,
  },
  {
    slug: 'sale-rotation',
    includes: (docId) => docId % 4 === 0,
  },
  {
    slug: 'new-arrivals-rotation',
    includes: (docId) => docId % 7 === 0,
  },
  {
    slug: 'premium-rotation',
    includes: (docId) => docId % 11 === 0,
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
    storeId: null,
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
      args.storeId = next;
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
  Direct listing read-model SQL for category page price_asc sorting with multiple
  overlapping categories, 8 OPTION facet groups, and all option combinations
  across the first 4 OPTION groups. It writes EXPLAIN ANALYZE JSON plans to
  test-results/listing-perf/.
`);
}

function cartesianOptionCombinations(groups) {
  return cartesianValueCombinations(groups.map((group) => group.values));
}

function cartesianValueCombinations(valueGroups) {
  return valueGroups.reduce(
    (combinations, group) =>
      combinations.flatMap((combination) => group.map((value) => [...combination, value])),
    [[]],
  );
}

function productOptionValuePool(group, productIndex, groupIndex) {
  if (typeof group.valuesPerProduct === 'number') {
    const count = Math.min(group.values.length, group.valuesPerProduct);
    return Array.from({ length: count }, (_, offset) => group.values[(productIndex + groupIndex + offset) % group.values.length]);
  }

  if (groupIndex < COMBINATION_OPTION_GROUP_COUNT) {
    return group.values;
  }

  const maxCount = Math.min(group.values.length, 3);
  const minCount = Math.min(maxCount, 2);
  const count = minCount + ((productIndex + groupIndex) % (maxCount - minCount + 1));

  return Array.from({ length: count }, (_, offset) => group.values[(productIndex + groupIndex + offset) % group.values.length]);
}

function productOptionValueKey(productIndex, groupIndex, valueHandle) {
  return `${productIndex}:${groupIndex}:${valueHandle}`;
}

function optionSignatureKey(valueKeys) {
  return [...new Set(valueKeys)].sort().join('|');
}

function composeGlobalId(typeName, id) {
  return Buffer.from(`gid://shopana/${typeName}/${id}`, 'utf8').toString('base64');
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildExpectedSeedMeta(input) {
  const selectedByFacet = new Map(input.facets.map((facet) => [facet.slug, new Set(facet.selected)]));
  const assignments = input.variants.map((variant) => {
    const facetValues = Object.fromEntries(input.facets.map((facet) => [facet.slug, variant.facetValues[facet.slug]]));

    return {
      productId: variant.productId,
      productGlobalId: composeGlobalId('Product', variant.productId),
      productDocId: variant.productDocId,
      variantDocId: variant.variantDocId,
      inScope: input.scopedProductDocIds.has(variant.productDocId),
      priceMinor: variant.priceMinor,
      facetValues,
    };
  });
  const matchesPriceFilter = (assignment) =>
    !input.priceFilter ||
    (assignment.priceMinor >= input.priceFilter.minMinor && assignment.priceMinor <= input.priceFilter.maxMinor);
  const matchesAllFilters = (assignment) =>
    assignment.inScope &&
    matchesPriceFilter(assignment) &&
    [...selectedByFacet.entries()].every(([facetSlug, selected]) => selected.has(assignment.facetValues[facetSlug]));
  const cheapestMatchingByProduct = new Map();
  for (const assignment of assignments.filter(matchesAllFilters)) {
    const existing = cheapestMatchingByProduct.get(assignment.productDocId);
    if (
      !existing ||
      assignment.priceMinor < existing.priceMinor ||
      (assignment.priceMinor === existing.priceMinor && assignment.variantDocId < existing.variantDocId)
    ) {
      cheapestMatchingByProduct.set(assignment.productDocId, assignment);
    }
  }
  const sortedAssignments = [...cheapestMatchingByProduct.values()].sort(
    (left, right) => left.priceMinor - right.priceMinor || left.productId.localeCompare(right.productId),
  );
  const selectedFacetCounts = Object.fromEntries(
    input.facets.map((facet) => [
      facet.slug,
      Object.fromEntries(
        facet.selected.map((valueHandle) => [
          valueHandle,
          new Set(
            assignments
              .filter((assignment) => {
                if (assignment.facetValues[facet.slug] !== valueHandle) {
                  return false;
                }
                if (!assignment.inScope) {
                  return false;
                }
                if (!matchesPriceFilter(assignment)) {
                  return false;
                }

                return input.facets
                  .filter((otherFacet) => otherFacet.slug !== facet.slug)
                  .every((otherFacet) =>
                    selectedByFacet.get(otherFacet.slug)?.has(assignment.facetValues[otherFacet.slug]),
                  );
              })
              .map((assignment) => assignment.productDocId),
          ).size,
        ]),
      ),
    ]),
  );

  return {
    expectedTotalCount: sortedAssignments.length,
    expectedPageProductIds: sortedAssignments.slice(0, input.pageSize).map((assignment) => assignment.productGlobalId),
    expectedPageProductDocIds: sortedAssignments.slice(0, input.pageSize).map((assignment) => assignment.productDocId),
    expectedSelectedFacetCounts: selectedFacetCounts,
  };
}

function buildExpectedPriceOnlySeedMeta(input) {
  const cheapestMatchingByProduct = new Map();

  for (const variant of input.variants) {
    if (!input.scopedProductDocIds.has(variant.productDocId)) {
      continue;
    }
    if (variant.priceMinor < input.priceFilter.minMinor || variant.priceMinor > input.priceFilter.maxMinor) {
      continue;
    }

    const existing = cheapestMatchingByProduct.get(variant.productDocId);
    if (
      !existing ||
      variant.priceMinor < existing.priceMinor ||
      (variant.priceMinor === existing.priceMinor && variant.variantDocId < existing.variantDocId)
    ) {
      cheapestMatchingByProduct.set(variant.productDocId, variant);
    }
  }

  const sortedAssignments = [...cheapestMatchingByProduct.values()].sort(
    (left, right) => left.priceMinor - right.priceMinor || left.productId.localeCompare(right.productId),
  );

  return {
    expectedTotalCount: sortedAssignments.length,
    expectedPageProductIds: sortedAssignments
      .slice(0, input.pageSize)
      .map((assignment) => composeGlobalId('Product', assignment.productId)),
    expectedPageProductDocIds: sortedAssignments.slice(0, input.pageSize).map((assignment) => assignment.productDocId),
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

  const storeId = args.storeId ?? randomUUID();
  const categoryId = args.categoryId ?? randomUUID();
  const productIds = Array.from({ length: args.products }, () => randomUUID());
  const productDocIds = Array.from({ length: args.products }, (_, index) => index + 1);
  const handles = productDocIds.map((docId) => `perf-product-${docId.toString().padStart(6, '0')}`);
  const now = new Date().toISOString();
  const categories = CATEGORY_SPECS.map((spec, index) => ({
    id: index === 0 ? categoryId : randomUUID(),
    slug: spec.slug,
    productDocIds: productDocIds.filter(spec.includes),
  }));
  const scopedProductDocIds = new Set(categories[0].productDocIds);

  const facets = OPTION_GROUPS.map((group, groupIndex) => ({
    ...group,
    id: randomUUID(),
    sourceId: randomUUID(),
    values: group.values.map((sourceValueHandle, valueIndex) => {
      const isRootSource = valueIndex === group.values.length - 1;

      return {
        id: randomUUID(),
        kind: isRootSource ? 'source' : 'group',
        handle: isRootSource ? `${group.slug}:${sourceValueHandle}` : sourceValueHandle,
        sourceValueHandle,
        childSourceId: isRootSource ? null : randomUUID(),
      };
    }),
  }));
  const productOptionValuePools = productDocIds.map((_, productIndex) =>
    OPTION_GROUPS.map((group, groupIndex) => productOptionValuePool(group, productIndex, groupIndex)),
  );
  const productOptionIds = productDocIds.map(() => OPTION_GROUPS.map(() => randomUUID()));
  const productOptionValueIds = new Map();
  for (const [productIndex, pools] of productOptionValuePools.entries()) {
    for (const [groupIndex, values] of pools.entries()) {
      for (const valueHandle of values) {
        productOptionValueIds.set(productOptionValueKey(productIndex, groupIndex, valueHandle), randomUUID());
      }
    }
  }
  const productVariantCounts = productOptionValuePools.map((pools) =>
    pools
      .slice(0, COMBINATION_OPTION_GROUP_COUNT)
      .reduce((total, values) => total * values.length, 1),
  );
  let nextVariantDocId = 1;
  const variants = productIds.flatMap((productId, productIndex) => {
    const pools = productOptionValuePools[productIndex];
    const combinations = cartesianValueCombinations(pools.slice(0, COMBINATION_OPTION_GROUP_COUNT));

    return combinations.map((combination, variantOffset) => {
      const variantDocId = nextVariantDocId++;
      const productDocId = productDocIds[productIndex];
      const facetValues = Object.fromEntries(
        facets.map((facet, groupIndex) => [
          facet.slug,
          groupIndex < COMBINATION_OPTION_GROUP_COUNT
            ? combination[groupIndex]
            : pools[groupIndex][variantOffset % pools[groupIndex].length],
        ]),
      );

      return {
        productId,
        productDocId,
        variantId: randomUUID(),
        variantDocId,
        variantOffset,
        priceMinor: 1_000 + ((variantDocId * 37 + variantOffset * 997 + productIndex * 13) % 90_000),
        facetValues,
        optionValueIds: facets.map((_, groupIndex) =>
          productOptionValueIds.get(productOptionValueKey(productIndex, groupIndex, facetValues[OPTION_GROUPS[groupIndex].slug])),
        ),
      };
    });
  });
  const productPrices = productDocIds.map(() => ({
    minPriceMinor: Number.POSITIVE_INFINITY,
    maxPriceMinor: 0,
  }));
  for (const variant of variants) {
    const productPrice = productPrices[variant.productDocId - 1];
    productPrice.minPriceMinor = Math.min(productPrice.minPriceMinor, variant.priceMinor);
    productPrice.maxPriceMinor = Math.max(productPrice.maxPriceMinor, variant.priceMinor);
  }
  const variantValueKeys = variants.map((variant) => {
    return facets.map((facet) => {
      const sourceValueHandle = variant.facetValues[facet.slug];
      const value = facet.values.find(
        (candidate) => candidate.sourceValueHandle === sourceValueHandle,
      );
      return `${facet.id}:${value.id}`;
    });
  });
  const signatureKeys = variantValueKeys.map(optionSignatureKey);
  const selectedFilterRows = facets.flatMap((facet) =>
    facet.selected.map((handle) => {
      const value = facet.values.find((candidate) => candidate.handle === handle);
      return { facetId: facet.id, valueKey: `${facet.id}:${value.id}` };
    }),
  );
  const expectedOptionOnly = buildExpectedSeedMeta({
    facets,
    productIds,
    productDocIds,
    variants,
    pageSize: args.pageSize,
    scopedProductDocIds,
    priceFilter: null,
  });
  const expectedOptionAndPrice = buildExpectedSeedMeta({
    facets,
    productIds,
    productDocIds,
    variants,
    pageSize: args.pageSize,
    scopedProductDocIds,
    priceFilter: {
      minMinor: PRICE_FILTER_MIN_MINOR,
      maxMinor: PRICE_FILTER_MAX_MINOR,
    },
  });
  const expectedPriceOnly = buildExpectedPriceOnlySeedMeta({
    variants,
    pageSize: args.pageSize,
    scopedProductDocIds,
    priceFilter: {
      minMinor: PRICE_FILTER_MIN_MINOR,
      maxMinor: PRICE_FILTER_MAX_MINOR,
    },
  });

  await sql.begin(async (tx) => {
    await seedCatalogProductsAndOptions(tx, {
      storeId,
      categoryId,
      productIds,
      productDocIds,
      handles,
      variants,
      categories,
      productOptionValuePools,
      productOptionIds,
      productOptionValueIds,
      now,
    });
    await seedListingFacets(tx, storeId, facets);
    await seedListingRows(tx, {
      storeId,
      categoryId,
      productIds,
      productDocIds,
      handles,
      variants,
      productPrices,
      signatureKeys,
      now,
    });
    await seedCategoryBitmaps(tx, storeId, categories);
    await seedVariantProjectionBlock(tx, storeId, variants);
    await seedOptionFacetBitmaps(tx, storeId, facets, variantValueKeys, variants);
    await seedOptionSignatures(tx, storeId, variantValueKeys, variants);
  });

  await sql`ANALYZE listing.product_listing_index`;
  await sql`ANALYZE listing.variant_listing_index`;
  await sql`ANALYZE listing.variant_listing_price_index`;
  await sql`ANALYZE listing.listing_posting_variant_price`;
  await sql`ANALYZE listing.listing_posting_bitmap`;
  await sql`ANALYZE listing.listing_posting_variant_storeion_block`;
  await sql`ANALYZE listing.listing_option_signature`;
  await sql`ANALYZE listing.listing_option_signature_value`;
  await sql`ANALYZE listing.listing_option_signature_product_membership`;

  if (args.seedOnly) {
    await writeText(
      args.outDir,
      `${RESULT_PREFIX}-seed.json`,
      `${JSON.stringify(
        {
          storeId,
          categoryId,
          variants: variants.length,
          variantsPerProduct: {
            min: Math.min(...productVariantCounts),
            max: Math.max(...productVariantCounts),
          },
          optionDistribution: OPTION_GROUPS.map((group, groupIndex) => {
            const counts = productOptionValuePools.map((pools) => pools[groupIndex].length);
            return {
              slug: group.slug,
              combinationAxis: groupIndex < COMBINATION_OPTION_GROUP_COUNT,
              valuesPerProduct: {
                min: Math.min(...counts),
                max: Math.max(...counts),
              },
            };
          }),
          categories: categories.map((category) => ({
            id: category.id,
            slug: category.slug,
            productCount: category.productDocIds.length,
          })),
          products: args.products,
          pageSize: args.pageSize,
          filters: OPTION_GROUPS.map(({ slug, selected }) => ({ slug, selected })),
          facetValueKinds: facets.map((facet) => ({
            slug: facet.slug,
            groupValueHandles: facet.values
              .filter((value) => value.kind === 'group')
              .map((value) => value.handle),
            rootSourceValueHandles: facet.values
              .filter((value) => value.kind === 'source')
              .map((value) => value.handle),
          })),
          priceFilter: {
            minMinor: PRICE_FILTER_MIN_MINOR,
            maxMinor: PRICE_FILTER_MAX_MINOR,
          },
          expected: {
            expectedTotalCount: expectedOptionAndPrice.expectedTotalCount,
            expectedSelectedFacetCounts: expectedOptionAndPrice.expectedSelectedFacetCounts,
            priceOnly: expectedPriceOnly,
            optionOnly: expectedOptionOnly,
            optionAndPrice: expectedOptionAndPrice,
          },
        },
        null,
        2,
      )}\n`,
    );
    console.log(`seeded project=${storeId} category=${categoryId} products=${args.products}`);
    console.log(
      `variants=${variants.length} variantsPerProduct=${Math.min(...productVariantCounts)}-${Math.max(...productVariantCounts)}`,
    );
    console.log(
      `filters=${selectedFilterRows.length} values across ${facets.length} OR groups price=${PRICE_FILTER_MIN_MINOR}-${PRICE_FILTER_MAX_MINOR}`,
    );
    console.log(
      `categories=${categories.map((category) => `${category.slug}:${category.productDocIds.length}`).join(' ')}`,
    );
    console.log(`seedMeta=${resolve(args.outDir, `${RESULT_PREFIX}-seed.json`)}`);
    await sql.end();
    return;
  }

  const pageInput = {
    storeId,
    categoryId,
    pageSize: args.pageSize,
    selectedFilterRows,
  };
  const totalInput = {
    storeId,
    categoryId,
    selectedFilterRows,
  };
  const pageSql = buildPageSelectSql(pageInput);
  const totalSql = buildTotalSelectSql(totalInput);

  const pageSelect = await measureQuery(() => runPageSelect(sql, pageSql));
  const totalSelect = await measureQuery(() => runTotalSelect(sql, totalSql));
  const pagePlan = await runPageExplain(sql, pageInput);
  const totalPlan = await runTotalExplain(sql, totalInput);

  await writeText(args.outDir, `${RESULT_PREFIX}-page.sql`, pageSql);
  await writeText(args.outDir, `${RESULT_PREFIX}-total.sql`, totalSql);
  await writePlan(args.outDir, `${RESULT_PREFIX}-page.json`, pagePlan);
  await writePlan(args.outDir, `${RESULT_PREFIX}-total.json`, totalPlan);

  const pageExecutionMs = planMetric(pagePlan, 'Execution Time');
  const totalExecutionMs = planMetric(totalPlan, 'Execution Time');
  const pageBuffers = collectBufferSummary(pagePlan[0].Plan);

  console.log(`seeded project=${storeId} category=${categoryId} products=${args.products}`);
  console.log(
    `variants=${variants.length} variantsPerProduct=${Math.min(...productVariantCounts)}-${Math.max(...productVariantCounts)}`,
  );
  console.log(`filters=${selectedFilterRows.length} values across ${facets.length} OR groups`);
  console.log(`categories=${categories.map((category) => `${category.slug}:${category.productDocIds.length}`).join(' ')}`);
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

async function seedCatalogProductsAndOptions(sql, input) {
  await seedCatalogProducts(sql, input);
  await seedCatalogCategories(sql, input.storeId, input.categories, input.now);
  await seedCatalogProductCategories(sql, input.storeId, input.productIds, input.categories);
  await seedCatalogVariants(sql, input.storeId, input.variants, input.now);
  await seedCatalogProductOptions(sql, input);
  await seedCatalogVariantOptionLinks(sql, input);
}

async function seedCatalogProducts(sql, input) {
  for (const productChunk of chunks(input.productIds.map((productId, index) => ({
    productId,
    handle: input.handles[index],
    docId: input.productDocIds[index],
  })), CATALOG_INSERT_CHUNK_SIZE)) {
    await sql`
      INSERT INTO catalog.product (
        store_id,
        id,
        handle,
        published_at,
        created_at,
        updated_at,
        revision,
        kind
      )
      SELECT
        ${input.storeId}::uuid,
        product_id,
        handle,
        ${input.now}::timestamptz,
        ${input.now}::timestamptz,
        ${input.now}::timestamptz,
        1,
        'BASE'
      FROM unnest(
        ${productChunk.map((row) => row.productId)}::uuid[],
        ${productChunk.map((row) => row.handle)}::text[]
      ) AS rows(product_id, handle)
      ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO catalog.product_translation (
        store_id,
        product_id,
        locale,
        name
      )
      SELECT
        ${input.storeId}::uuid,
        product_id,
        ${LOCALE},
        'Perf product ' || doc_id::text
      FROM unnest(
        ${productChunk.map((row) => row.productId)}::uuid[],
        ${productChunk.map((row) => row.docId)}::int[]
      ) AS rows(product_id, doc_id)
      ON CONFLICT (product_id, locale) DO NOTHING
    `;
  }
}

async function seedCatalogCategories(sql, storeId, categories, now) {
  await sql`
    INSERT INTO catalog.category (
      store_id,
      id,
      path,
      depth,
      handle,
      default_sort,
      default_sort_direction,
      published_at,
      revision,
      products_count,
      created_at,
      updated_at
    )
    SELECT
      ${storeId}::uuid,
      category_id,
      '/' || slug,
      0,
      slug,
      'price',
      'asc',
      ${now}::timestamptz,
      1,
      product_count,
      ${now}::timestamptz,
      ${now}::timestamptz
    FROM unnest(
      ${categories.map((category) => category.id)}::uuid[],
      ${categories.map((category) => category.slug)}::text[],
      ${categories.map((category) => category.productDocIds.length)}::int[]
    ) AS rows(category_id, slug, product_count)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO catalog.category_translation (
      store_id,
      category_id,
      locale,
      name
    )
    SELECT
      ${storeId}::uuid,
      category_id,
      ${LOCALE},
      slug
    FROM unnest(
      ${categories.map((category) => category.id)}::uuid[],
      ${categories.map((category) => category.slug)}::text[]
    ) AS rows(category_id, slug)
    ON CONFLICT (category_id, locale) DO NOTHING
  `;
}

async function seedCatalogProductCategories(sql, storeId, productIds, categories) {
  const productIdByDocId = new Map(productIds.map((productId, index) => [index + 1, productId]));

  for (const category of categories) {
    const isPrimary = category.slug === CATEGORY_SPECS[0].slug;
    const rows = category.productDocIds.map((productDocId, index) => ({
      productId: productIdByDocId.get(productDocId),
      lexoRank: String(index + 1).padStart(12, '0'),
    }));

    for (const rowChunk of chunks(rows, CATALOG_INSERT_CHUNK_SIZE)) {
      await sql`
        INSERT INTO catalog.product_category (
          store_id,
          product_id,
          category_id,
          is_primary,
          lexo_rank
        )
        SELECT
          ${storeId}::uuid,
          product_id,
          ${category.id}::uuid,
          ${isPrimary}::boolean,
          lexo_rank
        FROM unnest(
          ${rowChunk.map((row) => row.productId)}::uuid[],
          ${rowChunk.map((row) => row.lexoRank)}::text[]
        ) AS rows(product_id, lexo_rank)
        ON CONFLICT (product_id, category_id) DO NOTHING
      `;
    }
  }
}

async function seedCatalogVariants(sql, storeId, variants, now) {
  for (const variantChunk of chunks(variants, CATALOG_INSERT_CHUNK_SIZE)) {
    await sql`
      INSERT INTO catalog.variant (
        store_id,
        product_id,
        kind,
        id,
        is_default,
        handle,
        sku,
        created_at,
        updated_at
      )
      SELECT
        ${storeId}::uuid,
        product_id,
        'BASE',
        variant_id,
        variant_offset = 0,
        'variant-' || variant_doc_id::text,
        'PERF-' || variant_doc_id::text,
        ${now}::timestamptz,
        ${now}::timestamptz
      FROM unnest(
        ${variantChunk.map((variant) => variant.productId)}::uuid[],
        ${variantChunk.map((variant) => variant.variantId)}::uuid[],
        ${variantChunk.map((variant) => variant.variantDocId)}::int[],
        ${variantChunk.map((variant) => variant.variantOffset)}::int[]
      ) AS rows(product_id, variant_id, variant_doc_id, variant_offset)
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

async function seedCatalogProductOptions(sql, input) {
  const optionRows = input.productIds.flatMap((productId, productIndex) =>
    OPTION_GROUPS.map((group, groupIndex) => ({
      optionId: input.productOptionIds[productIndex][groupIndex],
      productId,
      slug: group.slug,
      sortIndex: groupIndex,
    })),
  );

  for (const optionChunk of chunks(optionRows, CATALOG_INSERT_CHUNK_SIZE)) {
    await sql`
      INSERT INTO catalog.product_option (
        id,
        store_id,
        product_id,
        slug,
        display_type,
        sort_index
      )
      SELECT
        option_id,
        ${input.storeId}::uuid,
        product_id,
        slug,
        'BUTTONS',
        sort_index
      FROM unnest(
        ${optionChunk.map((row) => row.optionId)}::uuid[],
        ${optionChunk.map((row) => row.productId)}::uuid[],
        ${optionChunk.map((row) => row.slug)}::text[],
        ${optionChunk.map((row) => row.sortIndex)}::int[]
      ) AS rows(option_id, product_id, slug, sort_index)
      ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO catalog.product_option_translation (
        store_id,
        option_id,
        locale,
        name
      )
      SELECT
        ${input.storeId}::uuid,
        option_id,
        ${LOCALE},
        slug
      FROM unnest(
        ${optionChunk.map((row) => row.optionId)}::uuid[],
        ${optionChunk.map((row) => row.slug)}::text[]
      ) AS rows(option_id, slug)
      ON CONFLICT (option_id, locale) DO NOTHING
    `;
  }

  const valueRows = [];
  for (const [productIndex, pools] of input.productOptionValuePools.entries()) {
    for (const [groupIndex, values] of pools.entries()) {
      for (const [sortIndex, valueHandle] of values.entries()) {
        valueRows.push({
          valueId: input.productOptionValueIds.get(productOptionValueKey(productIndex, groupIndex, valueHandle)),
          optionId: input.productOptionIds[productIndex][groupIndex],
          valueHandle,
          sortIndex,
        });
      }
    }
  }

  for (const valueChunk of chunks(valueRows, CATALOG_INSERT_CHUNK_SIZE)) {
    await sql`
      INSERT INTO catalog.product_option_value (
        id,
        store_id,
        option_id,
        slug,
        sort_index
      )
      SELECT
        value_id,
        ${input.storeId}::uuid,
        option_id,
        value_handle,
        sort_index
      FROM unnest(
        ${valueChunk.map((row) => row.valueId)}::uuid[],
        ${valueChunk.map((row) => row.optionId)}::uuid[],
        ${valueChunk.map((row) => row.valueHandle)}::text[],
        ${valueChunk.map((row) => row.sortIndex)}::int[]
      ) AS rows(value_id, option_id, value_handle, sort_index)
      ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO catalog.product_option_value_translation (
        store_id,
        option_value_id,
        locale,
        name
      )
      SELECT
        ${input.storeId}::uuid,
        value_id,
        ${LOCALE},
        value_handle
      FROM unnest(
        ${valueChunk.map((row) => row.valueId)}::uuid[],
        ${valueChunk.map((row) => row.valueHandle)}::text[]
      ) AS rows(value_id, value_handle)
      ON CONFLICT (option_value_id, locale) DO NOTHING
    `;
  }
}

async function seedCatalogVariantOptionLinks(sql, input) {
  for (const variantChunk of chunks(input.variants, VARIANT_OPTION_LINK_INSERT_CHUNK_SIZE)) {
    const links = variantChunk.flatMap((variant) =>
      OPTION_GROUPS.map((_, groupIndex) => ({
        variantId: variant.variantId,
        optionId: input.productOptionIds[variant.productDocId - 1][groupIndex],
        optionValueId: variant.optionValueIds[groupIndex],
      })),
    );

    await sql`
      INSERT INTO catalog.product_option_variant_link (
        store_id,
        variant_id,
        option_id,
        option_value_id
      )
      SELECT
        ${input.storeId}::uuid,
        variant_id,
        option_id,
        option_value_id
      FROM unnest(
        ${links.map((row) => row.variantId)}::uuid[],
        ${links.map((row) => row.optionId)}::uuid[],
        ${links.map((row) => row.optionValueId)}::uuid[]
      ) AS rows(variant_id, option_id, option_value_id)
      ON CONFLICT (variant_id, option_id) DO NOTHING
    `;
  }
}

async function seedListingFacets(sql, storeId, facets) {
  for (const [facetIndex, facet] of facets.entries()) {
    await sql`
      INSERT INTO listing.facet (
        id,
        store_id,
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
        ${storeId}::uuid,
        'OPTION',
        'checkbox',
        'multi',
        ${String(facetIndex + 1).padStart(8, '0')},
        ${facet.slug},
        now(),
        now()
      )
      ON CONFLICT (store_id, slug) DO NOTHING
    `;
    await sql`
      INSERT INTO listing.facet_translation (facet_id, locale, store_id, label)
      VALUES (${facet.id}::uuid, ${LOCALE}, ${storeId}::uuid, ${facet.slug})
      ON CONFLICT (facet_id, locale) DO UPDATE SET label = EXCLUDED.label
    `;
    await sql`
      INSERT INTO listing.facet_source (
        id,
        store_id,
        facet_id,
        facet_type,
        handle,
        created_at
      )
      VALUES (
        ${facet.sourceId}::uuid,
        ${storeId}::uuid,
        ${facet.id}::uuid,
        'OPTION',
        ${facet.slug},
        now()
      )
      ON CONFLICT (store_id, facet_id, handle) DO NOTHING
    `;
    await sql`
      INSERT INTO listing.facet_source_translation (
        facet_source_id,
        locale,
        store_id,
        name
      )
      VALUES (${facet.sourceId}::uuid, ${LOCALE}, ${storeId}::uuid, ${facet.slug})
      ON CONFLICT (facet_source_id, locale) DO UPDATE SET name = EXCLUDED.name
    `;

    for (const [valueIndex, value] of facet.values.entries()) {
      await sql`
        INSERT INTO listing.facet_value (
          id,
          store_id,
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
          ${storeId}::uuid,
          ${facet.id}::uuid,
          ${value.kind},
          ${value.handle},
          ${valueIndex},
          true,
          now(),
          now()
        )
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO listing.facet_value_translation (
          facet_value_id,
          locale,
          store_id,
          label
        )
        VALUES (${value.id}::uuid, ${LOCALE}, ${storeId}::uuid, ${value.handle})
        ON CONFLICT (facet_value_id, locale) DO UPDATE SET label = EXCLUDED.label
      `;

      if (value.kind === 'group') {
        const sourceHandle = `${facet.slug}:${value.sourceValueHandle}`;
        await sql`
          INSERT INTO listing.facet_value (
            id,
            store_id,
            facet_id,
            parent_id,
            kind,
            handle,
            sort_index,
            enabled,
            created_at,
            updated_at
          )
          VALUES (
            ${value.childSourceId}::uuid,
            ${storeId}::uuid,
            ${facet.id}::uuid,
            ${value.id}::uuid,
            'source',
            ${sourceHandle},
            ${valueIndex},
            true,
            now(),
            now()
          )
          ON CONFLICT (id) DO NOTHING
        `;
        await sql`
          INSERT INTO listing.facet_value_translation (
            facet_value_id,
            locale,
            store_id,
            label
          )
          VALUES (
            ${value.childSourceId}::uuid,
            ${LOCALE},
            ${storeId}::uuid,
            ${value.sourceValueHandle}
          )
          ON CONFLICT (facet_value_id, locale) DO UPDATE SET label = EXCLUDED.label
        `;
      }
    }
  }
}

async function seedListingRows(sql, input) {
  const productMinPrices = input.productPrices.map((price) => price.minPriceMinor);
  const productMaxPrices = input.productPrices.map((price) => price.maxPriceMinor);

  await sql`
    INSERT INTO listing.product_listing_index (
      store_id,
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
      ${input.storeId}::uuid,
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

  for (const variantChunk of chunks(input.variants, VARIANT_INSERT_CHUNK_SIZE)) {
    const variantProductIds = variantChunk.map((variant) => variant.productId);
    const variantProductDocIds = variantChunk.map((variant) => variant.productDocId);
    const variantIds = variantChunk.map((variant) => variant.variantId);
    const variantDocIds = variantChunk.map((variant) => variant.variantDocId);
    const variantPrices = variantChunk.map((variant) => variant.priceMinor);
    const signatureKeys = variantChunk.map((variant) => input.signatureKeys[variant.variantDocId - 1]);

    await sql`
      INSERT INTO listing.variant_listing_index (
        store_id,
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
        ${input.storeId}::uuid,
        product_id,
        product_doc_id,
        variant_id,
        variant_doc_id,
        signature_key,
        true,
        1,
        now(),
        now()
      FROM unnest(
        ${variantProductIds}::uuid[],
        ${variantProductDocIds}::int[],
        ${variantIds}::uuid[],
        ${variantDocIds}::int[],
        ${signatureKeys}::text[]
      ) AS rows(product_id, product_doc_id, variant_id, variant_doc_id, signature_key)
    `;

    await sql`
      INSERT INTO listing.variant_listing_price_index (
        store_id,
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
        ${input.storeId}::uuid,
        variant_id,
        ${CURRENCY},
        variant_doc_id,
        product_doc_id,
        product_id,
        signature_key,
        price_minor,
        true,
        now(),
        now()
      FROM unnest(
        ${variantProductIds}::uuid[],
        ${variantProductDocIds}::int[],
        ${variantIds}::uuid[],
        ${variantDocIds}::int[],
        ${signatureKeys}::text[],
        ${variantPrices}::bigint[]
      ) AS rows(product_id, product_doc_id, variant_id, variant_doc_id, signature_key, price_minor)
    `;

    await sql`
      INSERT INTO listing.listing_posting_variant_price (
        store_id,
        currency,
        variant_doc_id,
        product_doc_id,
        product_id,
        price_minor
      )
      SELECT
        ${input.storeId}::uuid,
        ${CURRENCY},
        variant_doc_id,
        product_doc_id,
        product_id,
        price_minor
      FROM unnest(
        ${variantProductIds}::uuid[],
        ${variantProductDocIds}::int[],
        ${variantDocIds}::int[],
        ${variantPrices}::bigint[]
      ) AS rows(product_id, product_doc_id, variant_doc_id, price_minor)
    `;
  }

  await sql`
    INSERT INTO listing.product_listing_price_index (
      store_id,
      product_id,
      currency,
      min_price_minor,
      max_price_minor,
      has_price,
      indexed_at,
      updated_at
    )
    SELECT
      ${input.storeId}::uuid,
      product_id,
      ${CURRENCY},
      min_price_minor,
      max_price_minor,
      true,
      now(),
      now()
    FROM unnest(
      ${input.productIds}::uuid[],
      ${productMinPrices}::bigint[],
      ${productMaxPrices}::bigint[]
    ) AS rows(product_id, min_price_minor, max_price_minor)
  `;

  await sql`
    INSERT INTO listing.listing_posting_product_sort (
      store_id,
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
      ${input.storeId}::uuid,
      product_doc_id,
      product_id,
      'price_asc',
      '',
      ${CURRENCY},
      ${ZERO_UUID}::uuid,
      true,
      min_price_minor
    FROM unnest(
      ${input.productIds}::uuid[],
      ${input.productDocIds}::int[],
      ${productMinPrices}::bigint[]
    ) AS rows(product_id, product_doc_id, min_price_minor)
  `;

  await sql`
    INSERT INTO listing.listing_posting_product_sort (
      store_id,
      product_doc_id,
      product_id,
      sort_kind,
      locale,
      currency,
      manual_scope_id,
      bool_value,
      timestamptz_value,
      timestamptz_value_2
    )
    SELECT
      ${input.storeId}::uuid,
      product_doc_id,
      product_id,
      'newest',
      '',
      '',
      ${ZERO_UUID}::uuid,
      true,
      ${input.now}::timestamptz - (product_doc_id || ' seconds')::interval,
      ${input.now}::timestamptz - (product_doc_id || ' seconds')::interval
    FROM unnest(
      ${input.productIds}::uuid[],
      ${input.productDocIds}::int[]
    ) AS rows(product_id, product_doc_id)
  `;
}

async function seedCategoryBitmaps(sql, storeId, categories) {
  for (const category of categories) {
    await sql`
      WITH docs AS (
        SELECT unnest(${category.productDocIds}::int[]) AS doc_id
      ),
      bitmap AS (
        SELECT COALESCE(rb_build_agg(doc_id), ${sql.unsafe(emptyBitmapSql)}) AS value
        FROM docs
      )
      INSERT INTO listing.listing_posting_bitmap (
        store_id,
        entity_type,
        field,
        value_key,
        bitmap,
        cardinality,
        metadata,
        updated_at
      )
      SELECT
        ${storeId}::uuid,
        'product',
        'category',
        ${category.id},
        value,
        rb_cardinality(value),
        ${JSON.stringify({ slug: category.slug })}::jsonb,
        now()
      FROM bitmap
    `;
  }
}

async function seedVariantProjectionBlock(sql, storeId, variants) {
  for (const [blockIndex, variantChunk] of chunks(variants, VARIANT_PROJECTION_BLOCK_SIZE).entries()) {
    const variantDocIds = variantChunk.map((variant) => variant.variantDocId);
    const productDocIds = [...new Set(variantChunk.map((variant) => variant.productDocId))];

    await sql`
      WITH variant_docs AS (
        SELECT unnest(${variantDocIds}::int[]) AS doc_id
      ),
      product_docs AS (
        SELECT unnest(${productDocIds}::int[]) AS doc_id
      ),
      variant_bitmap AS (
        SELECT rb_build_agg(doc_id) AS value
        FROM variant_docs
      ),
      product_bitmap AS (
        SELECT rb_build_agg(doc_id) AS value
        FROM product_docs
      )
      INSERT INTO listing.listing_posting_variant_storeion_block (
        store_id,
        block_id,
        variant_doc_from,
        variant_doc_to,
        variant_bitmap,
        product_bitmap,
        variant_count,
        product_count
      )
      SELECT
        ${storeId}::uuid,
        ${blockIndex},
        ${variantDocIds[0]},
        ${variantDocIds[variantDocIds.length - 1] + 1},
        variant_bitmap.value,
        product_bitmap.value,
        rb_cardinality(variant_bitmap.value)::int,
        rb_cardinality(product_bitmap.value)::int
      FROM variant_bitmap
      CROSS JOIN product_bitmap
    `;
  }
}

async function seedOptionFacetBitmaps(sql, storeId, facets, variantValueKeys, variants) {
  const grouped = new Map();

  for (const [variantIndex, valueKeys] of variantValueKeys.entries()) {
    for (const valueKey of valueKeys) {
      const docIds = grouped.get(valueKey) ?? [];
      docIds.push(variants[variantIndex].variantDocId);
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
          store_id,
          entity_type,
          field,
          value_key,
          bitmap,
          cardinality,
          metadata,
          updated_at
        )
        SELECT
          ${storeId}::uuid,
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

async function seedOptionSignatures(sql, storeId, variantValueKeys, variants) {
  const groups = new Map();

  for (const [variantIndex, valueKeys] of variantValueKeys.entries()) {
    const signatureKey = optionSignatureKey(valueKeys);
    const group = groups.get(signatureKey) ?? { valueKeys, productVariantCounts: new Map() };
    const variant = variants[variantIndex];
    group.productVariantCounts.set(variant.productDocId, (group.productVariantCounts.get(variant.productDocId) ?? 0) + 1);
    groups.set(signatureKey, group);
  }

  for (const [signatureKey, group] of groups.entries()) {
    const optionSignatureId = randomUUID();
    const facetIds = group.valueKeys.map((valueKey) => valueKey.split(':')[0]);
    const membershipProductDocIds = [...group.productVariantCounts.keys()];
    const membershipVariantCounts = membershipProductDocIds.map((productDocId) =>
      group.productVariantCounts.get(productDocId),
    );

    await sql`
      WITH docs AS (
        SELECT unnest(${membershipProductDocIds}::int[]) AS doc_id
      ),
      bitmap AS (
        SELECT rb_build_agg(doc_id) AS value
        FROM docs
      )
      INSERT INTO listing.listing_option_signature (
        option_signature_id,
        store_id,
        signature_key,
        option_value_count,
        product_bitmap,
        cardinality,
        metadata,
        updated_at
      )
      SELECT
        ${optionSignatureId}::uuid,
        ${storeId}::uuid,
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
        store_id,
        signature_key,
        facet_id,
        value_key
      )
      SELECT
        ${optionSignatureId}::uuid,
        ${storeId}::uuid,
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
        store_id,
        signature_key,
        product_doc_id,
        variant_count,
        updated_at
      )
      SELECT
        ${optionSignatureId}::uuid,
        ${storeId}::uuid,
        ${signatureKey},
        product_doc_id,
        variant_count,
        now()
      FROM unnest(
        ${membershipProductDocIds}::int[],
        ${membershipVariantCounts}::int[]
      ) AS rows(product_doc_id, variant_count)
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
        ${sqlLiteral(input.storeId)}::uuid AS store_id,
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
        ON p.store_id = i.store_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = sfv.value_key
      GROUP BY sfv.facet_id
    ),
    in_stock_variants AS (
      SELECT COALESCE(rb_build_agg(vli.variant_doc_id), ${emptyBitmapSql}) AS bitmap
      FROM listing.variant_listing_index vli
      JOIN input i ON true
      WHERE vli.store_id = i.store_id
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
        WHERE p.store_id = i.store_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${emptyBitmapSql}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${emptyBitmapSql}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.store_id = i.store_id
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
          FROM listing.listing_posting_variant_storeion_block b
          JOIN input i ON true
          WHERE b.store_id = i.store_id
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
            ON vli.store_id = i.store_id
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
        ON vli.store_id = vp.store_id
       AND vli.variant_id = vp.variant_id
       AND vli.in_stock = true
      JOIN input i ON true
      CROSS JOIN matches m
      CROSS JOIN variant_filters vf
      WHERE vp.store_id = i.store_id
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
        ON pli.store_id = i.store_id
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
        ${sqlLiteral(input.storeId)}::uuid AS store_id,
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
        ON p.store_id = i.store_id
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
        WHERE p.store_id = i.store_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${emptyBitmapSql}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${emptyBitmapSql}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.store_id = i.store_id
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
        ${input.storeId}::uuid AS store_id,
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
        ON p.store_id = i.store_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = sfv.value_key
      GROUP BY sfv.facet_id
    ),
    in_stock_variants AS (
      SELECT COALESCE(rb_build_agg(vli.variant_doc_id), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM listing.variant_listing_index vli
      JOIN input i ON true
      WHERE vli.store_id = i.store_id
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
        WHERE p.store_id = i.store_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.store_id = i.store_id
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
          FROM listing.listing_posting_variant_storeion_block b
          JOIN input i ON true
          WHERE b.store_id = i.store_id
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
            ON vli.store_id = i.store_id
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
        ON vli.store_id = vp.store_id
       AND vli.variant_id = vp.variant_id
       AND vli.in_stock = true
      JOIN input i ON true
      CROSS JOIN matches m
      CROSS JOIN variant_filters vf
      WHERE vp.store_id = i.store_id
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
        ON pli.store_id = i.store_id
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
        ${input.storeId}::uuid AS store_id,
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
        ON p.store_id = i.store_id
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
        WHERE p.store_id = i.store_id
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = i.category_value_key
      ), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${sql.unsafe(emptyBitmapSql)}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.store_id = i.store_id
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
