import { FC, useCallback } from 'react';
import { BoldExtension } from '@remirror/extension-bold';
import { useActive, useCommands } from '@remirror/react-core';

import { CommandButton, CommandButtonProps } from './CmdButton';

export interface ToggleBoldButtonProps
  extends Omit<
    CommandButtonProps,
    'commandName' | 'active' | 'enabled' | 'attrs' | 'onSelect'
  > {}

export const ToggleBoldButton: FC<ToggleBoldButtonProps> = (props) => {
  const { toggleBold } = useCommands<BoldExtension>();

  const onToggle = useCallback(() => {
    if (toggleBold.enabled()) {
      toggleBold();
    }
  }, [toggleBold]);

  const active = useActive<BoldExtension>().bold();
  const enabled = toggleBold.enabled();

  return (
    <CommandButton
      {...props}
      commandName="toggleBold"
      active={active}
      enabled={enabled}
      onSelect={onToggle}
    />
  );
};
