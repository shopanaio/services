import type { IDrawerPayload } from '@/layouts/drawers';

/**
 * Category drawer payload types
 */
export interface CategoryDrawerPayload extends IDrawerPayload {
  entityId: string;
  mode?: 'view' | 'edit';
}

/**
 * Module augmentation for type-safe drawer access
 */
declare module '@/layouts/drawers' {
  interface DrawerPayloads {
    category: CategoryDrawerPayload;
  }
}
