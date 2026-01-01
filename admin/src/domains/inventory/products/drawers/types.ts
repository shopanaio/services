import type { IDrawerPayload } from '@/layouts/drawers';

/**
 * Product drawer payload types
 */
export interface ProductDrawerPayload extends IDrawerPayload {
  entityId: string;
  mode?: 'view' | 'edit';
}

export interface ProductCreateDrawerPayload extends IDrawerPayload {
  mode: 'create';
  categoryId?: string;
  duplicateFromId?: string;
}

/**
 * Module augmentation for type-safe drawer access
 * This allows useDrawer('product') to be fully typed
 */
declare module '@/layouts/drawers' {
  interface DrawerPayloads {
    product: ProductDrawerPayload;
    'product-create': ProductCreateDrawerPayload;
  }
}
