import {
  FC,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { CoreIcon, isString, uniqueId } from '@remirror/core';
import { Icon } from '@remirror/react-components';
import { Menu, MenuProps, Tooltip } from 'antd';
import { IconButton } from '@components/IconButton';

interface ButtonIconProps {
  icon: CoreIcon | JSX.Element | null;
}

const ButtonIcon: FC<ButtonIconProps> = ({ icon }) => {
  if (isString(icon)) {
    return <Icon name={icon} size="1rem" />;
  }

  return icon;
};

export interface DropdownButtonProps
  extends Omit<MenuProps, 'open' | 'anchorEl' | 'id'> {
  'aria-label': string;
  label?: NonNullable<ReactNode>;
  icon?: CoreIcon | JSX.Element;
}

export const DropdownButton: FC<DropdownButtonProps> = ({
  label,
  'aria-label': ariaLabel,
  icon,
  children,
  onClose,
  ...rest
}) => {
  const id = useRef<string>(uniqueId());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMouseDown: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();
    },
    [],
  );

  const handleClick: MouseEventHandler<HTMLElement> = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose: MenuProps['onClose'] = useCallback(
    (e: Event, reason: 'backdropClick' | 'escapeKeyDown') => {
      setAnchorEl(null);
      onClose?.(e, reason);
    },
    [onClose],
  );

  return (
    <>
      <Tooltip title={label ?? ariaLabel}>
        <IconButton
          aria-label={ariaLabel}
          aria-controls={open ? id.current : undefined}
          aria-haspopup
          aria-expanded={open ? 'true' : undefined}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          size="small"
        >
          {icon && <ButtonIcon icon={icon} />}
          <Icon name="arrowDownSFill" size="1rem" />
        </IconButton>
      </Tooltip>
      <Menu
        {...rest}
        id={id.current}
        // anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {children}
      </Menu>
    </>
  );
};
