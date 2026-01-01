import type { MutableRefObject } from 'react';
import { IMenuLink } from '@src/entity/Menu/Link';

export interface TreeItem extends IMenuLink {
  children: TreeItem[];
  collapsed?: boolean;
}

export type TreeItems = TreeItem[];

export interface FlattenedItem extends TreeItem {
  parentId: ID | null;
  depth: number;
  index: number;
}

export type SensorContext = MutableRefObject<{
  items: FlattenedItem[];
  offset: number;
}>;
