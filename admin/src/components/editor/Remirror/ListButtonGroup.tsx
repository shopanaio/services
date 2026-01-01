import { ToggleBulletListButton } from '@components/editor/Remirror/ToggleBulletList';
import { ToggleOrderedListButton } from '@components/editor/Remirror/ToggleOrderedListButton';
import { Space } from 'antd';
import { FC } from 'react';

export interface ListButtonGroupProps {}

export const ListButtonGroup: FC<ListButtonGroupProps> = () => (
  <Space.Compact>
    <ToggleBulletListButton />
    <ToggleOrderedListButton />
  </Space.Compact>
);
