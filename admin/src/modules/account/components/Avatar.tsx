import { css } from '@emotion/react';
import { $session } from '@modules/auth/store/session';
import { useSelector } from '@reframework/qx';
import { Avatar } from 'antd';
import SkeletonAvatar from 'antd/es/skeleton/Avatar';

interface IUserAvatarProps {
  size?: 'small' | 'large' | number | null;
  onClick?: () => void;
  shape?: 'circle' | 'square';
}

export const UserAvatar = ({
  size = 'large',
  onClick,
  shape = 'circle',
  ...props
}: IUserAvatarProps) => {
  const user = useSelector($session.currentUser);

  if (!user) {
    return <SkeletonAvatar active size={size} />;
  }

  return (
    <Avatar
      {...props}
      onClick={onClick}
      shape={shape}
      data-testid="user-avatar"
      size={size}
      css={css`
        background-color: var(--color-purple-2);
        color: var(--color-purple-6);
        cursor: pointer;
      `}
    >
      {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}` || 'U'}
    </Avatar>
  );
};
