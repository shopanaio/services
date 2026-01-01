import React, { forwardRef } from 'react';

import { MdDragIndicator } from 'react-icons/md';
import { Button } from 'antd';
import { getIconProps } from '@components/styles';
import { ActionProps } from '../Action';

export const Handle = forwardRef<HTMLButtonElement, ActionProps>(
  (props, ref) => {
    return (
      <Button
        type="text"
        ref={ref}
        cursor="grab"
        data-cypress="draggable-handle"
        icon={<MdDragIndicator {...getIconProps()} />}
        {...props}
      />
    );
  },
);
