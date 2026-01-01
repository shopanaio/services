import { MutationTypes } from '@src/defs/constants';
import { getState } from '@reframework/qx';
import { waitFor } from '@testing-library/react';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { $drawers } from './drawers';

const mockCrypto = (mockCrypto: any) => {
  const originalCrypto = window.crypto;
  window.crypto = Object.assign(window.crypto, mockCrypto);

  return () => {
    window.crypto = originalCrypto;
  };
};

describe('drawers store', () => {
  let restoreCrypto: () => void;

  beforeEach(() => {
    restoreCrypto = mockCrypto({
      randomUUID: jest.fn(() => 'uuid'),
    });
  });

  afterEach(() => {
    restoreCrypto();
  });

  it('should update state correctly', async () => {
    const payload1 = {
      mutationType: MutationTypes.CREATE,
      entityId: 1,
      type: DrawerTypes.CREATE_PRODUCT,
    };

    const payload2 = {
      mutationType: MutationTypes.EDIT,
      entityId: 2,
      type: DrawerTypes.EDIT_PRODUCT,
    };

    // @ts-expect-error - mock
    window.crypto.randomUUID.mockImplementationOnce(() => 'uuid1');
    // @ts-expect-error - mock
    window.crypto.randomUUID.mockImplementationOnce(() => 'uuid2');

    $drawers.addDrawer(payload1);
    $drawers.addDrawer(payload2);

    $drawers.setDirty({ uuid: 'uuid1', isDirty: true });
    $drawers.setDirty({ uuid: 'uuid2', isDirty: true });
    $drawers.setDirty({ uuid: 'uuid1', isDirty: false });

    await waitFor(() => {
      expect(getState($drawers.store)).toEqual({
        drawers: [
          { ...payload1, uuid: 'uuid1', isDirty: false },
          { ...payload2, uuid: 'uuid2', isDirty: true },
        ],
      });
    });

    $drawers.removeDrawer('uuid2');
    await waitFor(() => {
      expect(getState($drawers.store)).toEqual({
        drawers: [{ ...payload1, uuid: 'uuid1', isDirty: false }],
      });
    });

    $drawers.removeDrawer('uuid1');
    await waitFor(() => {
      expect(getState($drawers.store)).toEqual({
        drawers: [],
      });
    });
  });
});
