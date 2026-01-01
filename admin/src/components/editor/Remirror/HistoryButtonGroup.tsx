import React, { FC, ReactNode } from 'react';

import { Space } from 'antd';
import { UndoButton } from '@components/editor/Remirror/UndoButton';
import { RedoButton } from '@components/editor/Remirror/RedoButton';

export interface HistoryButtonGroupProps {}

export const HistoryButtonGroup: FC<HistoryButtonGroupProps> = () => (
  <Space.Compact>
    <UndoButton />
    <RedoButton />
  </Space.Compact>
);
