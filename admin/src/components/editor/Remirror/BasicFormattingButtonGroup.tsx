import { FC, ReactNode } from 'react';

import { ToggleBoldButton } from '@components/editor/Remirror/BoldButton';
import { ToggleItalicButton } from '@components/editor/Remirror/ToggleItalicButton';
import { ToggleUnderlineButton } from '@components/editor/Remirror/ToggleUnderlineButton';
import { Space } from 'antd';
import { ToggleStrikeButton } from '@components/editor/Remirror/ToggleStrikeButton';

export interface BasicFormattingButtonGroupProps {
  children?: ReactNode | ReactNode[];
}

export const BasicFormattingButtonGroup: FC<
  BasicFormattingButtonGroupProps
> = () => (
  <Space.Compact>
    <ToggleBoldButton />
    <ToggleItalicButton />
    <ToggleUnderlineButton />
    <ToggleStrikeButton />
  </Space.Compact>
);
