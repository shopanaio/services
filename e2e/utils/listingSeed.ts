import postgres from 'postgres';
import { decodeGlobalId } from './globalid';

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

export async function seedListingCategoryProducts({
  storeId,
  category,
  products,
  locale = 'en',
  currency = 'USD',
}: SeedListingCategoryProductsInput): Promise<void> {
  const sql = createListingSeedClient();

  try {
    await sql.begin(async (tx) => {
      const projectUuid = decodeGlobalId(storeId).id;
      const categoryUuid = decodeGlobalId(category.id).id;
      const seedProducts = await assignProductDocIds(tx, projectUuid, products);

      for (const product of seedProducts) {
        await seedListingProduct(tx, {
          projectUuid,
          productUuid: decodeGlobalId(product.id).id,
          variantUuid: product.variantId ? decodeGlobalId(product.variantId).id : null,
          productDocId: product.productDocId,
          handle: product.handle,
          title: product.title,
          publishedAt: product.publishedAt,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          revision: product.revision,
          priceMinor: product.priceMinor,
          manualSortKey: product.manualSortKey,
          searchTitle: product.searchTitle,
          variantSignatureKey: optionSignatureKey(product.variantFacetValueKeys ?? []),
          inStock: product.inStock ?? true,
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
        productDocIds: seedProducts.map((product) => product.productDocId),
      });

      await seedFacetPostings(tx, {
        projectUuid,
        entityType: 'product',
        productFacetEntries: seedProducts
          .filter((product) => product.inStock ?? true)
          .flatMap((product) =>
            (product.productFacetValueKeys ?? []).map((valueKey) => ({
              valueKey,
              docId: product.productDocId,
            })),
          ),
      });

      await seedFacetPostings(tx, {
        projectUuid,
        entityType: 'variant',
        productFacetEntries: seedProducts
          .filter((product) => product.inStock ?? true)
          .flatMap((product) =>
            (product.variantFacetValueKeys ?? []).map((valueKey) => ({
              valueKey,
              docId: product.productDocId,
            })),
          ),
      });

      await seedOptionSignatures(tx, {
        projectUuid,
        products: seedProducts
          .filter((product) => product.inStock ?? true)
          .map((product) => ({
            productDocId: product.productDocId,
            valueKeys: product.variantFacetValueKeys ?? [],
          })),
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
): Promise<(ListingSeedProductInput & { productDocId: number })[]> {
  const [{ maxDocId }] = await sql<{ maxDocId: number | null }[]>`
    SELECT COALESCE(MAX(product_doc_id), 0)::int AS "maxDocId"
    FROM listing.product_listing_index
    WHERE store_id = ${projectUuid}::uuid
  `;
  let nextDocId = (maxDocId ?? 0) + 1;

  return products.map((product) => {
    if (product.productDocId) {
      return { ...product, productDocId: product.productDocId };
    }

    const productDocId = nextDocId;
    nextDocId += 1;
    return { ...product, productDocId };
  });
}

async function seedListingProduct(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productUuid: string;
    variantUuid?: string | null;
    productDocId: number;
    handle?: string | null;
    title?: string | null;
    publishedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    revision?: number | null;
    priceMinor?: number | null;
    manualSortKey?: string | null;
    searchTitle?: string | null;
    variantSignatureKey: string | null;
    inStock: boolean;
    categoryUuid: string;
    locale: string;
    currency: string;
  },
) {
  const now = new Date().toISOString();
  const publishedAt = input.publishedAt ?? now;
  const createdAt = input.createdAt ?? publishedAt;
  const updatedAt = input.updatedAt ?? publishedAt;

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
      ${input.inStock},
      ${input.inStock ? 1 : 0},
      now(),
      now()
    )
    ON CONFLICT (product_id) DO UPDATE SET
      store_id = EXCLUDED.store_id,
      product_doc_id = EXCLUDED.product_doc_id,
      kind = EXCLUDED.kind,
      handle = EXCLUDED.handle,
      status = EXCLUDED.status,
      published_at = EXCLUDED.published_at,
      product_created_at = EXCLUDED.product_created_at,
      product_updated_at = EXCLUDED.product_updated_at,
      product_revision = EXCLUDED.product_revision,
      in_stock = EXCLUDED.in_stock,
      total_stock = EXCLUDED.total_stock,
      updated_at = now()
  `;

  await seedProductSort(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    productDocId: input.productDocId,
    sortKind: 'newest',
    locale: '',
    currency: '',
    manualScopeId: ZERO_UUID,
    boolValue: input.inStock,
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
    boolValue: input.inStock,
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
    boolValue: input.inStock,
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
    boolValue: input.inStock,
    textValue: input.manualSortKey ?? input.title ?? input.handle ?? input.productUuid,
  });

  if (input.priceMinor !== undefined && input.priceMinor !== null) {
    await seedVariantPrice(sql, {
      projectUuid: input.projectUuid,
      productUuid: input.productUuid,
      productDocId: input.productDocId,
      variantUuid: input.variantUuid ?? input.productUuid,
      variantDocId: input.productDocId,
      priceMinor: input.priceMinor,
      currency: input.currency,
      signatureKey: input.variantSignatureKey ?? 'default',
      inStock: input.inStock,
    });

    await seedProductSort(sql, {
      projectUuid: input.projectUuid,
      productUuid: input.productUuid,
      productDocId: input.productDocId,
      sortKind: 'price_asc',
      locale: '',
      currency: input.currency,
      manualScopeId: ZERO_UUID,
      boolValue: input.inStock,
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
      boolValue: input.inStock,
      bigintValue: input.priceMinor,
    });
  }

  await seedProductSearchTitle(sql, {
    projectUuid: input.projectUuid,
    productUuid: input.productUuid,
    locale: input.locale,
    title: input.searchTitle ?? input.title ?? input.handle ?? input.productUuid,
    publishedAt,
    createdAt,
    updatedAt,
    revision: input.revision ?? 0,
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
    signatureKey: string;
    inStock: boolean;
  },
) {
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
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.productUuid}::uuid,
      ${input.productDocId},
      ${input.variantUuid}::uuid,
      ${input.variantDocId},
      ${input.signatureKey},
      ${input.inStock},
      ${input.inStock ? 1 : 0},
      now(),
      now()
    )
    ON CONFLICT (variant_id) DO UPDATE SET
      store_id = EXCLUDED.store_id,
      product_id = EXCLUDED.product_id,
      product_doc_id = EXCLUDED.product_doc_id,
      variant_doc_id = EXCLUDED.variant_doc_id,
      signature_key = EXCLUDED.signature_key,
      in_stock = EXCLUDED.in_stock,
      total_stock = EXCLUDED.total_stock,
      updated_at = now()
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
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.variantUuid}::uuid,
      ${input.currency},
      ${input.variantDocId},
      ${input.productDocId},
      ${input.productUuid}::uuid,
      ${input.signatureKey},
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
      signature_key = EXCLUDED.signature_key,
      price_minor = EXCLUDED.price_minor,
      has_price = EXCLUDED.has_price,
      updated_at = now()
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
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.currency},
      ${input.variantDocId},
      ${input.productDocId},
      ${input.productUuid}::uuid,
      ${input.priceMinor}
    )
    ON CONFLICT (store_id, currency, variant_doc_id) DO UPDATE SET
      product_doc_id = EXCLUDED.product_doc_id,
      product_id = EXCLUDED.product_id,
      price_minor = EXCLUDED.price_minor
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

async function seedProductSearchTitle(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productUuid: string;
    locale: string;
    title: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
    revision: number;
  },
) {
  await sql`
    INSERT INTO listing.product_title_bm25_search_index (
      search_id,
      store_id,
      product_id,
      locale,
      kind,
      status,
      published_at,
      product_created_at,
      product_updated_at,
      product_revision,
      title,
      indexed_at,
      updated_at
    )
    VALUES (
      ${crypto.randomUUID()}::uuid,
      ${input.projectUuid}::uuid,
      ${input.productUuid}::uuid,
      ${input.locale},
      'BASE',
      'published',
      ${input.publishedAt},
      ${input.createdAt},
      ${input.updatedAt},
      ${input.revision},
      ${input.title},
      now(),
      now()
    )
    ON CONFLICT (product_id, locale) DO UPDATE SET
      search_id = EXCLUDED.search_id,
      store_id = EXCLUDED.store_id,
      kind = EXCLUDED.kind,
      status = EXCLUDED.status,
      published_at = EXCLUDED.published_at,
      product_created_at = EXCLUDED.product_created_at,
      product_updated_at = EXCLUDED.product_updated_at,
      product_revision = EXCLUDED.product_revision,
      title = EXCLUDED.title,
      updated_at = now()
  `;
}

async function seedVariantProjectionBlock(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    productDocIds: number[];
  },
) {
  if (input.productDocIds.length === 0) {
    return;
  }

  const variantDocFrom = Math.min(...input.productDocIds);
  const variantDocTo = Math.max(...input.productDocIds) + 1;

  await sql`
    WITH docs AS (
      SELECT unnest(${input.productDocIds}::int[]) AS doc_id
    ),
    bitmap AS (
      SELECT rb_build_agg(doc_id) AS value
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
      value,
      value,
      rb_cardinality(value)::int,
      rb_cardinality(value)::int
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

async function seedOptionSignatures(
  sql: postgres.TransactionSql,
  input: {
    projectUuid: string;
    products: { productDocId: number; valueKeys: string[] }[];
  },
) {
  const groups = new Map<string, { productDocIds: number[]; valueKeys: string[] }>();

  for (const product of input.products) {
    const valueKeys = normalizeValueKeys(product.valueKeys);
    if (valueKeys.length === 0) {
      continue;
    }

    const signatureKey = optionSignatureKey(valueKeys);
    if (!signatureKey) {
      continue;
    }
    const group = groups.get(signatureKey) ?? { productDocIds: [], valueKeys };
    group.productDocIds.push(product.productDocId);
    groups.set(signatureKey, group);
  }

  for (const [signatureKey, group] of groups.entries()) {
    const optionSignatureId = crypto.randomUUID();
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
        ${input.projectUuid}::uuid,
        ${signatureKey},
        ${group.valueKeys.length},
        value,
        rb_cardinality(value),
        '{}'::jsonb,
        now()
      FROM bitmap
      ON CONFLICT (store_id, signature_key) DO UPDATE SET
        option_value_count = EXCLUDED.option_value_count,
        product_bitmap = EXCLUDED.product_bitmap,
        cardinality = EXCLUDED.cardinality,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `;

    const [{ storedOptionSignatureId }] = await sql<{ storedOptionSignatureId: string }[]>`
      SELECT option_signature_id::text AS "storedOptionSignatureId"
      FROM listing.listing_option_signature
      WHERE store_id = ${input.projectUuid}::uuid
        AND signature_key = ${signatureKey}
    `;

    for (const [index, valueKey] of group.valueKeys.entries()) {
      await sql`
        INSERT INTO listing.listing_option_signature_value (
          option_signature_id,
          store_id,
          signature_key,
          facet_id,
          value_key
        )
        VALUES (
          ${storedOptionSignatureId}::uuid,
          ${input.projectUuid}::uuid,
          ${signatureKey},
          ${facetIds[index]}::uuid,
          ${valueKey}
        )
        ON CONFLICT (option_signature_id, value_key) DO UPDATE SET
          store_id = EXCLUDED.store_id,
          signature_key = EXCLUDED.signature_key,
          facet_id = EXCLUDED.facet_id
      `;
    }

    for (const productDocId of group.productDocIds) {
      await sql`
        INSERT INTO listing.listing_option_signature_product_membership (
          option_signature_id,
          store_id,
          signature_key,
          product_doc_id,
          variant_count,
          updated_at
        )
        VALUES (
          ${storedOptionSignatureId}::uuid,
          ${input.projectUuid}::uuid,
          ${signatureKey},
          ${productDocId},
          1,
          now()
        )
        ON CONFLICT (option_signature_id, product_doc_id) DO UPDATE SET
          store_id = EXCLUDED.store_id,
          signature_key = EXCLUDED.signature_key,
          variant_count = EXCLUDED.variant_count,
          updated_at = now()
      `;
    }
  }
}

function optionSignatureKey(valueKeys: string[]): string | null {
  const normalized = normalizeValueKeys(valueKeys);
  return normalized.length > 0 ? normalized.join('|') : null;
}

function normalizeValueKeys(valueKeys: string[]): string[] {
  return [...new Set(valueKeys.map((valueKey) => valueKey.trim()).filter(Boolean))].sort();
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
