import { FC, MouseEventHandler, ReactNode, useCallback } from 'react';
import { CoreIcon, isString } from '@remirror/core';
import { Icon } from '@remirror/react-components';

import { Menu, Typography } from 'antd';
import {
  useCommandOptionValues,
  UseCommandOptionValuesParams,
} from './useCommandOptionValues';

interface ButtonIconProps {
  icon: CoreIcon | JSX.Element | null;
}

const MenuItemIcon: FC<ButtonIconProps> = ({ icon }) => {
  if (icon) {
    return (
      // Icon
      <>{isString(icon) ? <Icon name={icon} size="1rem" /> : <>{icon}</>}</>
    );
  }

  return null;
};

export interface CommandMenuItemProps
  extends Omit<UseCommandOptionValuesParams, 'active' | 'attrs'> {
  active?: UseCommandOptionValuesParams['active'];
  commandName: string;
  displayShortcut?: boolean;
  onSelect: () => void;
  icon?: CoreIcon | JSX.Element | null;
  attrs?: UseCommandOptionValuesParams['attrs'];
  label?: NonNullable<ReactNode>;
  description?: NonNullable<ReactNode>;
  displayDescription?: boolean;
}

export const CommandMenuItem: FC<CommandMenuItemProps> = ({
  commandName,
  active = false,
  enabled,
  attrs,
  onSelect,
  icon,
  displayShortcut = true,
  label,
  description,
  displayDescription = true,
  ...rest
}) => {
  const handleClick = useCallback(() => {
    onSelect();
  }, [onSelect]);

  const handleMouseDown: MouseEventHandler<HTMLLIElement> = useCallback((e) => {
    e.preventDefault();
  }, []);

  const commandOptions = useCommandOptionValues({
    commandName,
    active,
    enabled,
    attrs,
  });

  let fallbackIcon = null;

  if (commandOptions.icon) {
    fallbackIcon = isString(commandOptions.icon)
      ? commandOptions.icon
      : commandOptions.icon.name;
  }

  const primary = label ?? commandOptions.label ?? '';
  const secondary =
    displayDescription && (description ?? commandOptions.description);

  return (
    <Menu.Item
      active={active}
      disabled={!enabled}
      onMouseDown={handleMouseDown}
      {...rest}
      onClick={() => handleClick()}
    >
      {icon !== null && <MenuItemIcon icon={icon ?? fallbackIcon} />}
      {primary} {secondary}
      {displayShortcut && commandOptions.shortcut && (
        <Typography.Text>{commandOptions.shortcut}</Typography.Text>
      )}
    </Menu.Item>
  );
};
