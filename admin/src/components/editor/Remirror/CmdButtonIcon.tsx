import { FC, ReactNode } from 'react';
import {
  CommandUiIcon,
  CoreIcon,
  isPlainObject,
  isString,
} from '@remirror/core';
import { Icon } from '@remirror/react-components';
import { Badge } from 'antd';
import { css } from '@emotion/react';

const isCommandUiIcon = (val: unknown): val is CommandUiIcon => {
  if (!isPlainObject(val)) {
    return false;
  }

  return !!val.name;
};

export interface CommandButtonIconProps {
  icon: CoreIcon | JSX.Element | null;
}

export const CommandButtonIcon: FC<CommandButtonIconProps> = ({ icon }) => {
  if (isString(icon)) {
    return <Icon name={icon} size="16px" />;
  }

  return icon;
};

export interface CommandButtonBadgeProps {
  icon?: CommandUiIcon | CoreIcon | JSX.Element | null;
  children: ReactNode;
}

export const CommandButtonBadge: FC<CommandButtonBadgeProps> = ({
  icon,
  children,
}) => {
  if (!isCommandUiIcon(icon)) {
    return <>{children}</>;
  }

  const { sub, sup } = icon;
  const value = sub ?? sup;
  const isBottom = sub !== undefined;

  if (value === undefined) {
    return <>{children}</>;
  }

  return (
    <Badge
      count={value}
      // anchorOrigin={{
      //   vertical: isBottom ? 'bottom' : 'top',
      //   horizontal: 'right',
      // }}

      css={css`
        /* bgcolor: background.paper; */
        color: 'text.secondary';
        min-width: 12px;
        height: 12px;
        margin: 2px 0;
        padding: 1px;
      `}
    >
      {children}
    </Badge>
  );
};
