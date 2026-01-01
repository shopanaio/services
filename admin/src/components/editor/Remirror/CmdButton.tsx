import { FC, MouseEventHandler, useCallback } from 'react';
import { isString } from '@remirror/core';

import {
  CommandButtonBadge,
  CommandButtonIcon,
} from '@components/editor/Remirror/CmdButtonIcon';
import { Button } from 'antd';

import { css } from '@emotion/react';
import {
  useCommandOptionValues,
  UseCommandOptionValuesParams,
} from './useCommandOptionValues';
import { remirrorStyles } from '@components/editor/Remirror/styes';

export interface CommandButtonProps {
  active?: boolean;
  enabled: boolean;
  commandName: string;
  icon?: JSX.Element | null;
  onSelect: () => void;
  attrs?: UseCommandOptionValuesParams['attrs'];
}

export const CommandButton: FC<CommandButtonProps> = ({
  commandName,
  active = false,
  enabled,
  onSelect,
  icon,
  attrs,
  ...rest
}) => {
  const handleClick = useCallback(() => {
    onSelect();
  }, [onSelect]);

  const handleMouseDown: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => e.preventDefault(),
    [],
  );

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

  const labelText = commandOptions.label ?? '';

  return (
    <Button
      aria-label={labelText}
      type="text"
      css={remirrorStyles.cmdButton(active)}
      disabled={!enabled}
      onMouseDown={handleMouseDown}
      {...rest}
      onClick={handleClick}
    >
      <CommandButtonBadge icon={commandOptions.icon}>
        <CommandButtonIcon icon={icon ?? fallbackIcon} />
      </CommandButtonBadge>
    </Button>
  );
};
