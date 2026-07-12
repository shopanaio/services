import postgres from 'postgres';
import { decodeGlobalId } from './globalid';

/*
 * Listing seed helpers write directly into listing index/posting tables.
 *
 * Specs that use this seed must run with:
 *   E2E_DISABLE_LISTING_EVENT_INDEXING=true
 *
 * Otherwise catalog product events can start background listing index workflows
 * while this seed writes the same rows. That makes the fixture nondeterministic:
 * product/variant doc IDs may be allocated twice, posting bitmaps can deadlock,
 * and direct seed data can race with event-driven indexing.
 *
 * For new listing seed helpers, keep the same contract: catalog data may be
 * created through the API, but listing read-model tables should have a single
 * writer during the spec. Either use direct seed with the env flag above, or do
 * not touch listing index/posting tables and wait for normal indexing instead.
 */

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:15432/portal';
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

export interface ListingSeedProductInput {
  id: string;
  variantId?: string | null;
  handle?: string | null;
  title?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  revision?: number | null;
  productDocId?: number;
  priceMinor?: number | null;
  manualSortKey?: string | null;
  searchTitle?: string | null;
  inStock?: boolean;
  productFacetValueKeys?: string[];
  variantFacetValueKeys?: string[];
}

export interface ListingSeedCategoryInput {
  id: string;
}

export interface SeedListingCategoryProductsInput {
  storeId: string;
  category: ListingSeedCategoryInput;
  products: ListingSeedProductInput[];
  locale?: string;
  currency?: string;
}

type SeedListingProductWithDocIds = ListingSeedProductInput & {
  productDocId: number;
  variantDocId: number;
};

type CanonicalSeedListingProduct = SeedListingProductWithDocIds & {
  availableForSale: boolean;
  productAvailable: boolean;
  variantTerms: readonly string[];
};

export async function seedListingCategoryProducts({
  storeId,
  category,
  products,
  locale = 'en',
  currency = 'USD',
}: SeedListingCategoryProductsInput): Promise<void> {
  if (process.env.E2E_DISABLE_LISTING_EVENT_INDEXING !== 'true') {
    throw new Error(
      'Direct listing seed requires E2E_DISABLE_LISTING_EVENT_INDEXING=true',
    );
  }

  const sql = createListingSeedClient();

  try {
    await sql.begin(async (tx) => {
      const projectUuid = decodeGlobalId(storeId).id;
      const categoryUuid = decodeGlobalId(category.id).id;
      const seedProducts = (
        await assignProductDocIds(tx, projectUuid, products)
      ).map(materializeCanonicalSeedProduct);

      for (const product of seedProducts) {
        await seedListingProduct(tx, {
          projectUuid,
          productUuid: decodeGlobalId(product.id).id,
          variantUuid: product.variantId ? decodeGlobalId(product.variantId).id : null,
          productDocId: product.productDocId,
          variantDocId: product.variantDocId,
          handle: product.handle,
          title: product.title,
          publishedAt: product.publishedAt,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          revision: product.revision,
          priceMinor: product.priceMinor,
          manualSortKey: product.manualSortKey,
          searchTitle: product.searchTitle,
          availableForSale: product.availableForSale,
          productAvailable: product.productAvailable,
          categoryUuid,
          locale,
          currency,
        });
      }

      await seedCategoryPosting(tx, {
        projectUuid,
        categoryUuid,
        productDocIds: seedProducts.map((product) => product.productDocId),
      });

      await seedVariantProjectionBlock(tx, {
        projectUuid,
        products: seedProducts.map((product) => ({
          productDocId: product.productDocId,
          variantDocId: product.variantDocId,
        })),
      });

      await seedFacetPostings(tx, {
        projectUuid,
        entityType: 'product',
        productFacetEntries: seedProducts
          .flatMap((product) =>
            (product.productFacetValueKeys ?? []).map((valueKey) => ({
              valueKey,
              docId: product.productDocId,
            })),
          ),
      });

      await seedVariantTermPostings(tx, {
        projectUuid,
        products: seedProducts,
      });
    });
  } finally {
    await sql.end();
  }
}

function createListingSeedClient() {
  return postgres(process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, {
    max: 1,
  });
}

async function assignProductDocIds(
  sql: postgres.TransactionSql,
  projectUuid: string,
  products: ListingSeedProductInput[],
): Promise<SeedListingProductWithDocIds[]> {
  const productUuids = products.map((product) => decodeGlobalId(product.id).id);
  const variantUuids = products.map((product, index) =>
    product.variantId ? decodeGlobalId(product.variantId).id : productUuids[index],
  );

  const existingProducts = productUuids.length
    ? await sql<{ productUuid: string; productDocId: number }[]>`
        SELECT
          product_id::text AS "productUuid",
          product_doc_id::int AS "productDocId"
        FROM listing.product_listing_index
        WHERE store_id = ${projectUuid}::uuid
          AND product_id = ANY(${productUuids}::uuid[])
      `
    : [];

  const existingVariants = variantUuids.length
    ? await sql<{ variantUuid: string; variantDocId: number }[]>`
        SELECT
          variant_id::text AS "variantUuid",
          variant_doc_id::int AS "variantDocId"
        FROM listing.variant_listing_index
        WHERE store_id = ${projectUuid}::uuid
          AND variant_id = ANY(${variantUuids}::uuid[])
      `
    : [];

  const [{ maxDocId }] = await sql<{ maxDocId: number | null }[]>`
    SELECT COALESCE(MAX(product_doc_id), 0)::int AS "maxDocId"
    FROM listing.product_listing_index
    WHERE store_id = ${projectUuid}::uuid
  `;

  const [{ maxVariantDocId }] = await sql<{ maxVariantDocId: number | null }[]>`
    SELECT COALESCE(MAX(variant_doc_id), 0)::int AS "maxVariantDocId"
    FROM listing.variant_listing_index
    WHERE store_id = ${projectUuid}::uuid
  `;

  const productDocIdsByProductId = new Map(
    existingProducts.map((product) => [product.productUuid, product.productDocId]),
  );
  const variantDocIdsByVariantId = new Map(existingVariants.map((variant) => [variant.variantUuid, variant.variantDocId]));
  const usedProductDocIds = new Set(existingProducts.map((product) => product.productDocId));
  const usedVariantDocIds = new Set(existingVariants.map((variant) => variant.variantDocId));
  let nextProductDocId = (maxDocId ?? 0) + 1;
  let nextVariantDocId = (maxVariantDocId ?? 0) + 1;

  const nextUnusedProductDocId = () => {
    while (usedProductDocIds.has(nextProductDocId)) {
      nextProductDocId += 1;
    }
    const docId = nextProductDocId;
    usedProductDocIds.add(docId);
    nextProductDocId += 1;
    return docId;
  };

  const nextUnusedVariantDocId = () => {
    while (usedVariantDocIds.has(nextVariantDocId)) {
      nextVariantDocId += 1;
    }
    const docId = nextVariantDocId;
    usedVariantDocIds.add(docId);
    nextVariantDocId += 1;
    return docId;
  };

  return products.map((product, index) => {
    const productDocId =
      productDocIdsByProductId.get(productUuids[index]) ?? product.productDocId ?? nextUnusedProductDocId();
    usedProductDocIds.add(productDocId);

    const variantDocId = variantDocIdsByVariantId.get(variantUuids[index]) ?? nextUnusedVariantDocId();
    usedVariantDocIds.add(variantDocId);

    return { ...product, productDocId, variantDocId };
  });
}

async function seedListingProduct(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productUuid: string;
    variantUuid?: string | null;
    productDocId: number;
    variantDocId: number;
    handle?: string | null;
    title?: string | null;
    publishedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    revision?: number | null;
    priceMinor?: number | null;
    manualSortKey?: string | null;
    searchTitle?: string | null;
    availableForSale: boolean;
    productAvailable: boolean;
    categoryUuid: string;
    locale: string;
    currency: string;
  },
) {
  const now = new Date().toISOString();
  const publishedAt = input.publishedAt ?? now;
  const createdAt = input.createdAt ?? publishedAt;
  const updatedAt = input.updatedAt ?? publishedAt;
  const totalStock = input.availableForSale ? 1 : 0;

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
      total_stock,
      indexed_at,
      updated_at
    )
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.productUuid}::uuid,
      ${input.productDocId},
      'BASE',
      ${input.handle ?? null},
      'published',
      ${publishedAt},
      ${createdAt},
      ${updatedAt},
      ${input.revision ?? 0},
      ${totalStock},
      now(),
      now()
    )
    ON CONFLICT (product_id) DO UPDATE SET
      store_id = EXCLUDED.store_id,
      kind = EXCLUDED.kind,
      handle = EXCLUDED.handle,
      status = EXCLUDED.status,
      published_at = EXCLUDED.published_at,
      product_created_at = EXCLUDED.product_created_at,
      product_updated_at = EXCLUDED.product_updated_at,
      product_revision = EXCLUDED.product_revision,
      total_stock = EXCLUDED.total_stock,
      updated_at = now()
  `;

  await seedVariantIndex(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    variantUuid: input.variantUuid ?? input.productUuid,
    variantDocId: input.variantDocId,
    totalStock,
  });

  await seedProductSort(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    sortKind: 'newest',
    locale: '',
    currency: '',
    manualScopeId: ZERO_UUID,
    boolValue: input.productAvailable,
    timestamptzValue: publishedAt,
    timestamptzValue2: createdAt,
    textValue: input.title ?? input.handle ?? input.productUuid,
  });

  await seedProductSort(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    sortKind: 'created',
    locale: '',
    currency: '',
    manualScopeId: ZERO_UUID,
    boolValue: input.productAvailable,
    timestamptzValue: createdAt,
  });

  await seedProductSort(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    sortKind: 'name',
    locale: input.locale,
    currency: '',
    manualScopeId: ZERO_UUID,
    boolValue: input.productAvailable,
    textValue: input.title ?? input.handle ?? input.productUuid,
  });

  await seedProductSort(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    sortKind: 'manual',
    locale: '',
    currency: '',
    manualScopeId: input.categoryUuid,
    boolValue: input.productAvailable,
    textValue: input.manualSortKey ?? input.title ?? input.handle ?? input.productUuid,
  });

  if (input.priceMinor !== undefined && input.priceMinor !== null) {
    await seedVariantPrice(sql, {
      projectUuid: input.projectUuid,
      productUuid: input.productUuid,
      productDocId: input.productDocId,
      variantUuid: input.variantUuid ?? input.productUuid,
      variantDocId: input.variantDocId,
      priceMinor: input.priceMinor,
      currency: input.currency,
    });

    await seedProductSort(sql, {
      projectUuid: input.projectUuid,
      productUuid: input.productUuid,
      productDocId: input.productDocId,
      sortKind: 'price_asc',
      locale: '',
      currency: input.currency,
      manualScopeId: ZERO_UUID,
      boolValue: input.productAvailable,
      bigintValue: input.priceMinor,
    });
    await seedProductSort(sql, {
      projectUuid: input.projectUuid,
      productUuid: input.productUuid,
      productDocId: input.productDocId,
      sortKind: 'price_desc',
      locale: '',
      currency: input.currency,
      manualScopeId: ZERO_UUID,
      boolValue: input.productAvailable,
      bigintValue: input.priceMinor,
    });
  }

  await seedProductSort(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    sortKind: 'availability',
    locale: '',
    currency: '',
    manualScopeId: ZERO_UUID,
    boolValue: input.productAvailable,
    bigintValue: totalStock,
  });

  await seedProductSearchText(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    locale: input.locale,
    title: input.searchTitle ?? input.title ?? input.handle ?? input.productUuid,
  });
}

async function seedProductSort(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productUuid: string;
    productDocId: number;
    sortKind: string;
    locale: string;
    currency: string;
    manualScopeId: string;
    boolValue?: boolean | null;
    timestamptzValue?: string | null;
    timestamptzValue2?: string | null;
    bigintValue?: number | null;
    textValue?: string | null;
  },
) {
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
      timestamptz_value_2,
      bigint_value,
      text_value
    )
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.productDocId},
      ${input.productUuid}::uuid,
      ${input.sortKind},
      ${input.locale},
      ${input.currency},
      ${input.manualScopeId}::uuid,
      ${input.boolValue ?? null},
      ${input.timestamptzValue ?? null},
      ${input.timestamptzValue2 ?? null},
      ${input.bigintValue ?? null},
      ${input.textValue ?? null}
    )
    ON CONFLICT (
      store_id,
      product_doc_id,
      sort_kind,
      locale,
      currency,
      manual_scope_id
    ) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      bool_value = EXCLUDED.bool_value,
      timestamptz_value = EXCLUDED.timestamptz_value,
      timestamptz_value_2 = EXCLUDED.timestamptz_value_2,
      bigint_value = EXCLUDED.bigint_value,
      text_value = EXCLUDED.text_value
  `;
}

async function seedVariantPrice(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productUuid: string;
    productDocId: number;
    variantUuid: string;
    variantDocId: number;
    priceMinor: number;
    currency: string;
  },
) {
  await sql`
    INSERT INTO listing.variant_listing_price_index (
      store_id,
      variant_id,
      currency,
      variant_doc_id,
      product_doc_id,
      product_id,
      price_minor,
      has_price,
      indexed_at,
      updated_at
    )
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.variantUuid}::uuid,
      ${input.currency},
      ${input.variantDocId},
      ${input.productDocId},
      ${input.productUuid}::uuid,
      ${input.priceMinor},
      true,
      now(),
      now()
    )
    ON CONFLICT (variant_id, currency) DO UPDATE SET
      store_id = EXCLUDED.store_id,
      variant_doc_id = EXCLUDED.variant_doc_id,
      product_doc_id = EXCLUDED.product_doc_id,
      product_id = EXCLUDED.product_id,
      price_minor = EXCLUDED.price_minor,
      has_price = EXCLUDED.has_price,
      updated_at = now()
  `;

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
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.productUuid}::uuid,
      ${input.currency},
      ${input.priceMinor},
      ${input.priceMinor},
      true,
      now(),
      now()
    )
    ON CONFLICT (product_id, currency) DO UPDATE SET
      store_id = EXCLUDED.store_id,
      min_price_minor = LEAST(
        COALESCE(listing.product_listing_price_index.min_price_minor, EXCLUDED.min_price_minor),
        EXCLUDED.min_price_minor
      ),
      max_price_minor = GREATEST(
        COALESCE(listing.product_listing_price_index.max_price_minor, EXCLUDED.max_price_minor),
        EXCLUDED.max_price_minor
      ),
      has_price = EXCLUDED.has_price,
      updated_at = now()
  `;
}

async function seedVariantIndex(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productUuid: string;
    productDocId: number;
    variantUuid: string;
    variantDocId: number;
    totalStock: number;
  },
) {
  await sql`
    INSERT INTO listing.variant_listing_index (
      store_id, product_id, product_doc_id, variant_id, variant_doc_id,
      total_stock, indexed_at, updated_at
    ) VALUES (
      ${input.projectUuid}::uuid, ${input.productUuid}::uuid,
      ${input.productDocId}, ${input.variantUuid}::uuid, ${input.variantDocId},
      ${input.totalStock}, now(), now()
    )
    ON CONFLICT (variant_id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      product_doc_id = EXCLUDED.product_doc_id,
      variant_doc_id = EXCLUDED.variant_doc_id,
      total_stock = EXCLUDED.total_stock,
      updated_at = now()
  `;
}

async function seedProductSearchText(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productUuid: string;
    productDocId: number;
    locale: string;
    title: string;
  },
) {
  const preparedText = input.title.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!preparedText) {
    throw new Error('Listing search seed title must not be empty');
  }

  await sql`
    INSERT INTO listing.product_search_text (
      store_id,
      product_id,
      product_doc_id,
      locale,
      field,
      element_id,
      prepared_text,
      normalization_contract_version,
      normalization_profile_revision,
      indexed_at
    )
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.productUuid}::uuid,
      ${input.productDocId},
      ${input.locale},
      'product_title',
      ${input.productUuid}::uuid,
      ${preparedText},
      'e2e-seed-v1',
      'e2e-seed-v1',
      now()
    )
    ON CONFLICT (product_id, locale, field, element_id) DO UPDATE SET
      store_id = EXCLUDED.store_id,
      product_doc_id = EXCLUDED.product_doc_id,
      prepared_text = EXCLUDED.prepared_text,
      normalization_contract_version = EXCLUDED.normalization_contract_version,
      normalization_profile_revision = EXCLUDED.normalization_profile_revision,
      indexed_at = now()
  `;
}

async function seedVariantProjectionBlock(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    products: { productDocId: number; variantDocId: number }[];
  },
) {
  if (input.products.length === 0) {
    return;
  }

  const variantDocIds = input.products.map((product) => product.variantDocId);
  const variantDocFrom = Math.min(...variantDocIds);
  const variantDocTo = Math.max(...variantDocIds) + 1;

  await sql`
    WITH docs AS (
      SELECT *
      FROM unnest(
        ${variantDocIds}::int[],
        ${input.products.map((product) => product.productDocId)}::int[]
      ) AS doc(variant_doc_id, product_doc_id)
    ),
    bitmap AS (
      SELECT
        rb_build_agg(variant_doc_id) AS variant_value,
        rb_build_agg(product_doc_id) AS product_value,
        COUNT(*)::int AS variant_count,
        COUNT(DISTINCT product_doc_id)::int AS product_count
      FROM docs
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
      ${input.projectUuid}::uuid,
      0,
      ${variantDocFrom},
      ${variantDocTo},
      variant_value,
      product_value,
      variant_count,
      product_count
    FROM bitmap
    ON CONFLICT (store_id, block_id) DO UPDATE SET
      variant_doc_from = EXCLUDED.variant_doc_from,
      variant_doc_to = EXCLUDED.variant_doc_to,
      variant_bitmap = EXCLUDED.variant_bitmap,
      product_bitmap = EXCLUDED.product_bitmap,
      variant_count = EXCLUDED.variant_count,
      product_count = EXCLUDED.product_count
  `;
}

async function seedCategoryPosting(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    categoryUuid: string;
    productDocIds: number[];
  },
) {
  await sql`
    WITH docs AS (
      SELECT unnest(${input.productDocIds}::int[]) AS doc_id
    ),
    bitmap AS (
      SELECT rb_build_agg(doc_id) AS value
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
      ${input.projectUuid}::uuid,
      'product',
      'category',
      ${input.categoryUuid},
      value,
      rb_cardinality(value),
      '{}'::jsonb,
      now()
    FROM bitmap
    ON CONFLICT (store_id, entity_type, field, value_key) DO UPDATE SET
      bitmap = EXCLUDED.bitmap,
      cardinality = EXCLUDED.cardinality,
      metadata = EXCLUDED.metadata,
      updated_at = now()
  `;
}

async function seedFacetPostings(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    entityType: 'product' | 'variant';
    productFacetEntries: { valueKey: string; docId: number }[];
  },
) {
  const grouped = groupDocIdsByValueKey(input.productFacetEntries);

  for (const [valueKey, docIds] of grouped.entries()) {
    await sql`
      WITH docs AS (
        SELECT unnest(${docIds}::int[]) AS doc_id
      ),
      bitmap AS (
        SELECT rb_build_agg(doc_id) AS value
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
        ${input.projectUuid}::uuid,
        ${input.entityType},
        'facet',
        ${valueKey},
        value,
        rb_cardinality(value),
        '{}'::jsonb,
        now()
      FROM bitmap
      ON CONFLICT (store_id, entity_type, field, value_key) DO UPDATE SET
        bitmap = EXCLUDED.bitmap,
        cardinality = EXCLUDED.cardinality,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `;
  }
}

async function seedVariantTermPostings(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    products: CanonicalSeedListingProduct[];
  },
) {
  const entries: { valueKey: string; docId: number }[] = [];
  const declaredKeys = [
    encodeVariantTerm('system.state', 'indexable'),
    encodeVariantTerm('criterion.availability', 'available'),
    encodeVariantTerm('criterion.availability', 'unavailable'),
  ];
  for (const product of input.products) {
    for (const valueKey of product.variantTerms) {
      entries.push({
        valueKey,
        docId: product.variantDocId,
      });
    }
  }
  const grouped = groupDocIdsByValueKey(entries);
  for (const valueKey of [...new Set([...declaredKeys, ...grouped.keys()])].sort()) {
    const docIds = grouped.get(valueKey) ?? [];
    const [version, fieldKey, termValueKey] = JSON.parse(valueKey) as string[];
    await sql`
      WITH docs AS (
        SELECT unnest(${docIds}::int[]) AS doc_id
      ),
      bitmap AS (
        SELECT COALESCE(
          (SELECT rb_build_agg(doc_id) FROM docs),
          (SELECT rb_build_agg(doc_id) - rb_build_agg(doc_id)
           FROM (VALUES (0::int)) AS empty_seed(doc_id))
        ) AS value
      )
      INSERT INTO listing.listing_posting_bitmap (
        store_id, entity_type, field, value_key, bitmap, cardinality, metadata, updated_at
      )
      SELECT
        ${input.projectUuid}::uuid,
        'variant', 'term', ${valueKey}, value, rb_cardinality(value),
        ${JSON.stringify({
          version,
          registryVersion: '2026-07-11.v1',
          registryField: fieldKey,
          registryValue: termValueKey,
        })}::jsonb,
        now()
      FROM bitmap
      ON CONFLICT (store_id, entity_type, field, value_key) DO UPDATE SET
        bitmap = EXCLUDED.bitmap,
        cardinality = EXCLUDED.cardinality,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `;
  }
}

function encodeVariantTerm(fieldKey: string, valueKey: string): string {
  return JSON.stringify(['v1', fieldKey, valueKey]);
}

function materializeCanonicalSeedProduct(
  product: SeedListingProductWithDocIds,
): CanonicalSeedListingProduct {
  const availableForSale = product.inStock ?? true;
  const variantTerms = [
    ...new Set([
      encodeVariantTerm('system.state', 'indexable'),
      encodeVariantTerm(
        'criterion.availability',
        availableForSale ? 'available' : 'unavailable',
      ),
      ...(product.variantFacetValueKeys ?? []).map((legacyValueKey) => {
        const separator = legacyValueKey.indexOf(':');
        const facetId = legacyValueKey.slice(0, separator);
        const facetValueId = legacyValueKey.slice(separator + 1);
        return encodeVariantTerm(`option:${facetId}`, facetValueId);
      }),
    ]),
  ].sort();
  const availableTerm = encodeVariantTerm(
    'criterion.availability',
    'available',
  );

  return {
    ...product,
    availableForSale,
    productAvailable: variantTerms.includes(availableTerm),
    variantTerms,
  };
}

function groupDocIdsByValueKey(entries: { valueKey: string; docId: number }[]): Map<string, number[]> {
  const grouped = new Map<string, Set<number>>();

  for (const entry of entries) {
    const valueKey = entry.valueKey.trim();
    if (!valueKey) {
      continue;
    }

    const docIds = grouped.get(valueKey) ?? new Set<number>();
    docIds.add(entry.docId);
    grouped.set(valueKey, docIds);
  }

  return new Map([...grouped.entries()].map(([valueKey, docIds]) => [valueKey, [...docIds].sort((a, b) => a - b)]));
}
