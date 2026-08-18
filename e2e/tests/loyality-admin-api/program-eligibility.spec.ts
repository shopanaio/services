import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createSegment } from '../customers-admin-api/helpers';
import { baseRules, createProgram, createVersion, expectUserError, idempotencyKey, requestVersionCreate, setupStore, versionInput } from './helpers';

test.describe('Loyalty Admin API program eligibility', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('canonicalizes ALL eligibility and retains explicit exclusions', async ({ api }) => {
    const excluded = await createSegment(api);
    const program = await createProgram(api);
    const version = await createVersion(api, program, { rules: baseRules({ eligibility: { type: 'ALL', channelCodes: ['WEB', 'POS'], segmentIds: [], excludedSegmentIds: [excluded.id] } }) });
    expect(version.rules.eligibility).toEqual({ type: 'ALL', channelCodes: ['WEB', 'POS'], segmentMatchMode: null, segmentIds: [], excludedSegmentIds: [excluded.id] });
  });

  test('supports SEGMENTS eligibility with ANY and ALL matching', async ({ api }) => {
    const included = [await createSegment(api), await createSegment(api)];
    for (const segmentMatchMode of ['ANY', 'ALL'] as const) {
      const program = await createProgram(api);
      const version = await createVersion(api, program, { rules: baseRules({ eligibility: { type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode, segmentIds: included.map(({ id }) => id), excludedSegmentIds: [] } }) });
      expect(version.rules.eligibility).toMatchObject({ type: 'SEGMENTS', segmentMatchMode, segmentIds: included.map(({ id }) => id) });
    }
  });

  test('requires non-empty unique channel codes', async ({ api }) => {
    for (const channelCodes of [[], [''], ['WEB', 'WEB']]) {
      const program = await createProgram(api);
      const result = await requestVersionCreate(api, versionInput(program, { rules: baseRules({ eligibility: { channelCodes } }), idempotencyKey: idempotencyKey('invalid-channel') }));
      expectUserError(result.payload);
      expect(result.payload.programVersion).toBeNull();
    }
  });

  test('forbids segment fields for ALL and requires them for SEGMENTS', async ({ api }) => {
    const segment = await createSegment(api);
    const cases = [
      { type: 'ALL', channelCodes: ['WEB'], segmentMatchMode: 'ANY', segmentIds: [segment.id], excludedSegmentIds: [] },
      { type: 'SEGMENTS', channelCodes: ['WEB'], segmentIds: [], excludedSegmentIds: [] },
      { type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode: 'ANY', segmentIds: [], excludedSegmentIds: [] },
    ];
    for (const eligibility of cases) {
      const program = await createProgram(api);
      const result = await requestVersionCreate(api, versionInput(program, { rules: baseRules({ eligibility }) }));
      expectUserError(result.payload);
    }
  });

  test('rejects duplicate, overlapping, missing, and foreign segments', async ({ api }) => {
    const segment = await createSegment(api);
    for (const eligibility of [
      { type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode: 'ANY', segmentIds: [segment.id, segment.id], excludedSegmentIds: [] },
      { type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode: 'ANY', segmentIds: [segment.id], excludedSegmentIds: [segment.id] },
      { type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode: 'ANY', segmentIds: [Buffer.from(`gid://shopana/CustomerSegment/${crypto.randomUUID()}`).toString('base64')], excludedSegmentIds: [] },
    ]) {
      const program = await createProgram(api);
      const result = await requestVersionCreate(api, versionInput(program, { rules: baseRules({ eligibility }) }));
      expectUserError(result.payload);
      expect(result.payload.programVersion).toBeNull();
    }
  });
});
