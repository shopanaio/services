import { FC, ReactNode } from 'react';

import { Space } from 'antd';
import { ToggleHeadingButton } from '@components/editor/Remirror/ToggleHeadingButton';
import DropdownButton from 'antd/es/dropdown/dropdown-button';
import { ToggleHeadingMenuItem } from './ToggleHeadingMenuItem';

export interface HeadingLevelButtonGroupProps {
  showAll?: boolean;
  children?: ReactNode | ReactNode[];
}

const LEVEL_1 = { level: 1 };
const LEVEL_2 = { level: 2 };
const LEVEL_3 = { level: 3 };
const LEVEL_4 = { level: 4 };
const LEVEL_5 = { level: 5 };
const LEVEL_6 = { level: 6 };

export const HeadingLevelButtonGroup: FC<HeadingLevelButtonGroupProps> = ({
  showAll = false,
  children,
}) => (
  <Space.Compact>
    <ToggleHeadingButton attrs={LEVEL_1} />
    <ToggleHeadingButton attrs={LEVEL_2} />
    {!showAll ? (
      <ToggleHeadingButton attrs={LEVEL_3} />
    ) : (
      <DropdownButton aria-label="More heading options">
        <ToggleHeadingMenuItem attrs={LEVEL_3} />
        <ToggleHeadingMenuItem attrs={LEVEL_4} />
        <ToggleHeadingMenuItem attrs={LEVEL_5} />
        <ToggleHeadingMenuItem attrs={LEVEL_6} />
      </DropdownButton>
    )}
    {children}
  </Space.Compact>
);
