import postgres from 'postgres';
import { decodeGlobalId } from './globalid';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:15432/portal';
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

export interface ListingSeedProductInput {
  id: string;
  handle?: string | null;
  title?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  revision?: number | null;
  productDocId?: number;
}

export interface ListingSeedCategoryInput {
  id: string;
}

export interface SeedListingCategoryProductsInput {
  projectId: string;
  category: ListingSeedCategoryInput;
  products: ListingSeedProductInput[];
}

export async function seedListingCategoryProducts({
  projectId,
  category,
  products,
}: SeedListingCategoryProductsInput): Promise<void> {
  const sql = createListingSeedClient();

  try {
    await sql.begin(async (tx) => {
      const projectUuid = decodeGlobalId(projectId).id;
      const categoryUuid = decodeGlobalId(category.id).id;
      const seedProducts = await assignProductDocIds(tx, projectUuid, products);

      for (const product of seedProducts) {
        await seedListingProduct(tx, {
          projectUuid,
          productUuid: decodeGlobalId(product.id).id,
          productDocId: product.productDocId,
          handle: product.handle,
          title: product.title,
          publishedAt: product.publishedAt,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          revision: product.revision,
        });
      }

      await seedCategoryPosting(tx, {
        projectUuid,
        categoryUuid,
        productDocIds: seedProducts.map((product) => product.productDocId),
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
    WHERE project_id = ${projectUuid}::uuid
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
    productDocId: number;
    handle?: string | null;
    title?: string | null;
    publishedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    revision?: number | null;
  },
) {
  const now = new Date().toISOString();
  const publishedAt = input.publishedAt ?? now;
  const createdAt = input.createdAt ?? publishedAt;
  const updatedAt = input.updatedAt ?? publishedAt;

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
      true,
      1,
      now(),
      now()
    )
    ON CONFLICT (product_id) DO UPDATE SET
      project_id = EXCLUDED.project_id,
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
      timestamptz_value,
      timestamptz_value_2,
      text_value
    )
    VALUES (
      ${input.projectUuid}::uuid,
      ${input.productDocId},
      ${input.productUuid}::uuid,
      'newest',
      '',
      '',
      ${ZERO_UUID}::uuid,
      true,
      ${publishedAt},
      ${createdAt},
      ${input.title ?? input.handle ?? input.productUuid}
    )
    ON CONFLICT (
      project_id,
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
      text_value = EXCLUDED.text_value
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
      ${input.projectUuid}::uuid,
      'product',
      'category',
      ${input.categoryUuid},
      value,
      rb_cardinality(value),
      '{}'::jsonb,
      now()
    FROM bitmap
    ON CONFLICT (project_id, entity_type, field, value_key) DO UPDATE SET
      bitmap = EXCLUDED.bitmap,
      cardinality = EXCLUDED.cardinality,
      metadata = EXCLUDED.metadata,
      updated_at = now()
  `;
}
