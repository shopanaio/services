import { getIconProps } from '@components/styles';
import { Button, ButtonProps } from 'antd';
import { MdAdd, MdClose, MdEdit, MdMoreHoriz } from 'react-icons/md';

const icons = {
  menu: <MdMoreHoriz {...getIconProps(18)} />,
  edit: <MdEdit />,
  close: <MdClose />,
  add: <MdAdd />,
} as const;

export const IconButton = (
  props: Omit<ButtonProps, 'icon'> & {
    icon: 'menu' | 'edit' | 'close' | 'add';
  },
) => {
  const { icon: iconType, ...rest } = props;
  const icon = icons[iconType];

  return <Button icon={icon} type="text" {...rest} />;
};
