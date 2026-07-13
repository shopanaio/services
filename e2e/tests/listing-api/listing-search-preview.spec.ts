import type { ApiSearchExplain, ApiSearchSettingsOperationResult } from '@codegen/admin-gql';
import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';

type Api = ApiFixtures['api'];

const SEARCH_FIELDS = [
  { field: 'PRODUCT_TITLE', weight: 10 },
  { field: 'VARIANT_TITLE', weight: 6 },
  { field: 'VENDOR_NAME', weight: 4 },
  { field: 'CATEGORY_NAME', weight: 2 },
] as const;

test.describe('Listing search preview API', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore({
      defaultCurrency: 'USD',
      locales: ['en'],
      currencies: ['USD'],
    });
  });

  test('explains synonym and product boost candidates in PRIMARY mode and typo fallback in FUZZY mode', async ({
    api,
  }) => {
    const unique = crypto.randomUUID().slice(0, 8);
    const [, , boostedProduct] = await Promise.all([
      createSearchProduct(api, unique, 'ruby runners daily'),
      createSearchProduct(api, unique, 'scarlet trainers'),
      createSearchProduct(api, unique, 'featured sandal'),
      createSearchProduct(api, unique, 'everyday sneaker'),
    ]);

    const { data } = await api.admin.mutation('listing-api/ListingSearchSettingsUpdate', {
      variables: {
        expectedVersion: 0,
        operations: {
          settings: {
            fields: SEARCH_FIELDS,
            typoToleranceEnabled: true,
            outOfStockPolicy: 'PLACE_LAST',
          },
          synonymGroups: [
            {
              action: 'CREATE',
              clientMutationId: 'ruby-runners-synonyms',
              locale: 'en',
              name: `Ruby runners ${unique}`,
              enabled: true,
              values: ['ruby runners', 'scarlet trainers'],
            },
          ],
          productBoosts: [
            {
              action: 'CREATE',
              clientMutationId: 'ruby-runners-boost',
              locale: 'en',
              name: `Ruby runners featured product ${unique}`,
              enabled: true,
              phrases: ['ruby runners'],
              productIds: [boostedProduct.id],
            },
          ],
        },
      },
    });

    const payload = data.listingMutation.search.settingsUpdate;
    expect(payload.userErrors).toHaveLength(0);
    expect(payload.settings).toMatchObject({
      version: 1,
      fields: SEARCH_FIELDS,
      typoToleranceEnabled: true,
      outOfStockPolicy: 'PLACE_LAST',
    });
    expect(payload.operationResults).toHaveLength(3);
    expect(payload.operationResults.every((result) => result.applied && result.errors.length === 0)).toBe(true);

    const synonymGroupId = operationEntityId(payload.operationResults, 'ruby-runners-synonyms');
    const productBoostId = operationEntityId(payload.operationResults, 'ruby-runners-boost');

    const primary = await pollSearchPreview(api, 'ruby runners', {
      mode: 'PRIMARY',
      candidateCount: 3,
      boostOnlyCandidateCount: 1,
    });

    expect(primary).toMatchObject({
      mode: 'PRIMARY',
      originalQuery: 'ruby runners',
      normalizedQuery: 'ruby runners',
      locale: 'en',
      candidateCount: 3,
      boostOnlyCandidateCount: 1,
      matchedSynonymGroupIds: [synonymGroupId],
      applicableProductBoostIds: [productBoostId],
      settings: {
        version: 1,
        enabledFields: SEARCH_FIELDS.map(({ field }) => field),
        fieldWeights: SEARCH_FIELDS,
        typoToleranceEnabled: true,
        outOfStockPolicy: 'PLACE_LAST',
      },
    });
    expect(primary.reasons).toEqual([
      'SYNONYM_EXPANSION',
      'IDENTIFIER_EXPANSION',
      'PRODUCT_BOOST',
      'BOOST_ONLY_CANDIDATE',
    ]);
    expect(primary.membershipSerializedBytes).toBeGreaterThan(0);
    expect(primary.normalizationContractVersion).toBeTruthy();
    expect(primary.normalizationProfileRevision).toBeTruthy();
    expect(primary.planFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(primary.units).toHaveLength(2);
    expect(primary.units[0]).toMatchObject({
      source: 'ruby',
      normalized: 'ruby',
      kind: 'TEXT',
      removedAsStopword: false,
      planUnitIndex: 0,
    });
    expect(primary.units[1]).toMatchObject({
      source: 'runners',
      normalized: 'runners',
      kind: 'TEXT',
      removedAsStopword: false,
      planUnitIndex: 0,
      clauses: [],
    });
    expect(primary.units[0].clauses.map((clause) => clause.kind)).toEqual([
      'FTS_PHRASE',
      'SYNONYM',
      'IDENTIFIER_EXACT',
      'IDENTIFIER_PREFIX',
    ]);
    const synonymClause = primary.units[0].clauses.find((clause) => clause.kind === 'SYNONYM');
    expect(synonymClause).toMatchObject({
      synonymGroupId,
      alternatives: [
        { kind: 'FTS_PHRASE', value: 'rubi runner', fields: SEARCH_FIELDS.map(({ field }) => field) },
        { kind: 'FTS_PHRASE', value: 'scarlet trainer', fields: SEARCH_FIELDS.map(({ field }) => field) },
      ],
    });
    expect(primary.wholeQueryClauses.map((clause) => clause.kind)).toEqual([
      'IDENTIFIER_EXACT',
      'IDENTIFIER_PREFIX',
    ]);

    const fuzzy = await pollSearchPreview(api, 'sneker', {
      mode: 'FUZZY',
      candidateCount: 1,
      boostOnlyCandidateCount: 0,
    });

    expect(fuzzy).toMatchObject({
      mode: 'FUZZY',
      originalQuery: 'sneker',
      normalizedQuery: 'sneker',
      locale: 'en',
      candidateCount: 1,
      boostOnlyCandidateCount: 0,
      matchedSynonymGroupIds: [],
      applicableProductBoostIds: [],
      reasons: ['FUZZY_FALLBACK', 'TYPO_EXPANSION'],
      wholeQueryClauses: [],
    });
    expect(fuzzy.units).toHaveLength(1);
    expect(fuzzy.units[0]).toMatchObject({
      source: 'sneker',
      normalized: 'sneker',
      kind: 'TEXT',
      removedAsStopword: false,
      planUnitIndex: 0,
    });
    expect(fuzzy.units[0].typoAlternatives).toEqual([
      expect.objectContaining({
        value: 'sneaker',
        lexemes: ['sneaker'],
        editDistance: 1,
      }),
    ]);
    expect(fuzzy.units[0].typoAlternatives[0].trigramSimilarity).toBeGreaterThan(0.3);
    expect(fuzzy.units[0].clauses).toEqual([
      expect.objectContaining({
        kind: 'FTS_TERMS',
        value: 'sneaker',
        lexemes: ['sneaker'],
        fields: SEARCH_FIELDS.map(({ field }) => field),
      }),
    ]);
  });
});

async function createSearchProduct(api: Api, unique: string, title: string) {
  return api.admin.product.createWithOptions({
    title,
    handle: `${title.replaceAll(' ', '-')}-${unique}`,
    status: 'PUBLISHED',
    price: 1_000,
    options: [
      {
        name: `Search style ${unique}`,
        slug: `search-style-${unique}`,
        values: ['Default'],
      },
    ],
  });
}

function operationEntityId(results: ApiSearchSettingsOperationResult[], clientMutationId: string): string {
  const result = results.find((operation) => operation.clientMutationId === clientMutationId);
  expect(result).toMatchObject({ applied: true, errors: [] });
  expect(result?.entityId).toBeTruthy();
  if (!result?.entityId) {
    throw new Error(`Search configuration operation did not return an entity ID: ${clientMutationId}`);
  }
  return result.entityId;
}

async function pollSearchPreview(
  api: Api,
  query: string,
  expected: Pick<ApiSearchExplain, 'mode' | 'candidateCount' | 'boostOnlyCandidateCount'>,
): Promise<ApiSearchExplain> {
  let preview: ApiSearchExplain | null = null;

  await expect
    .poll(
      async () => {
        const response = await api.admin.query('listing-api/ListingSearchPreview', {
          variables: { query, locale: 'en' },
          throwOnError: false,
        });
        preview = response.data?.listingQuery?.search?.explain ?? null;
        return preview
          ? {
              mode: preview.mode,
              candidateCount: preview.candidateCount,
              boostOnlyCandidateCount: preview.boostOnlyCandidateCount,
            }
          : null;
      },
      {
        timeout: 60_000,
        intervals: [500, 1_000, 2_000, 5_000],
      },
    )
    .toEqual(expected);

  if (!preview) {
    throw new Error(`Search preview was not available for query: ${query}`);
  }
  return preview;
}
