export const SYNTHETIC_ID_LENGTH = 6;
export const REAL_ID_LENGTH = crypto.randomUUID().length;

export const syntheticId = () => {
  return crypto.randomUUID().slice(-SYNTHETIC_ID_LENGTH);
};

export const isSyntheticId = (id: any) =>
  typeof id === 'string' && id.length === SYNTHETIC_ID_LENGTH;

export const isSyntheticRecord = (r: { id: any }) =>
  typeof r.id === 'string' && r.id.length === SYNTHETIC_ID_LENGTH;

const isRealId = (id: any) =>
  typeof id === 'string' && id.length === REAL_ID_LENGTH;

export const hasRealId = (it: { id: any } | null) => isRealId(it?.id);

/**
 * Should be used in payload to set null value for id
 */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';
