import { CenterAlignButton } from '@components/editor/Remirror/AlignCenterButton';
import { JustifyAlignButton } from '@components/editor/Remirror/AlignJustifyButton';
import { LeftAlignButton } from '@components/editor/Remirror/AlignLeftButton';
import { RightAlignButton } from '@components/editor/Remirror/AlignRightButton';
import { Space } from 'antd';
import { FC } from 'react';

export interface TextAlignmentButtonGroupProps {
  showAll?: boolean;
}

export const TextAlignmentButtonGroup: FC<TextAlignmentButtonGroupProps> = ({
  showAll = false,
}) => (
  <Space.Compact>
    <LeftAlignButton />
    <CenterAlignButton />
    <RightAlignButton />
    {showAll && <JustifyAlignButton />}
  </Space.Compact>
);
