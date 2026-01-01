import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { $projects } from '@modules/projects/store/projects';
import { useSelector } from '@reframework/qx';
import { ShopIcon } from '@src/layouts/app/components/StoreMenu/shop-icon/ShopIcon';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { getStoreAvatarColors } from '@src/utils/utils';
import { Avatar, Typography } from 'antd';

export const StoreLabel = () => {
  const project = useSelector($projects.currentProject)!;
  const avatarColors = getStoreAvatarColors('blue');

  return (
    <DrawerPaper>
      <Flex
        gap="3"
        align="center"
        w="100%"
        css={css`
          border-radius: var(--radius-base);
          transition: background-color 0.2s ease;
        `}
      >
        <Avatar
          shape="square"
          size="large"
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: ${avatarColors.background};
          `}
        >
          <Flex align="center" justify="center">
            <ShopIcon color={avatarColors.color} size={24} />
          </Flex>
        </Avatar>

        <Flex
          w="100%"
          direction="column"
          css={css`
            max-height: var(--x8);
          `}
        >
          <Typography.Text
            ellipsis
            css={css`
              color: currentColor;
            `}
          >
            {project.name}
          </Typography.Text>
          <Typography.Text
            ellipsis
            css={css`
              color: var(--color-gray-6);
              font-size: var(--font-size-xs);
            `}
          >
            {project.slug}
          </Typography.Text>
        </Flex>
      </Flex>
    </DrawerPaper>
  );
};
