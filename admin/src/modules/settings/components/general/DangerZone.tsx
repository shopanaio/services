import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { Avatar, Button, Modal, Typography } from 'antd';
import { css } from '@emotion/react';
import { ShopIcon } from '@src/layouts/app/components/StoreMenu/shop-icon/ShopIcon';
import { useState } from 'react';
import { getStoreAvatarColors } from '@src/utils/utils';
import { useDeleteProject } from '@modules/shared/hooks/useDeleteProject';
import { IProjectInfo } from '@src/entity/Project/Project';

export const StoreDangerZone = ({ project }: { project: IProjectInfo }) => {
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const avatarColors = getStoreAvatarColors('red');
  const { deleteProject, loading: deleteProjectLoading } = useDeleteProject();
  const onDeleteProject = async () => {
    deleteProject(project.slug);
  };

  return (
    <>
      <Modal
        footer={null}
        open={deleteProjectModalOpen}
        onCancel={() => setDeleteProjectModalOpen(false)}
      >
        <Flex direction="column" align="center" w="100%">
          <Avatar
            shape="square"
            size="large"
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: ${avatarColors.background};
              margin-bottom: var(--x4);
            `}
          >
            <Flex align="center" justify="center">
              <ShopIcon color={avatarColors.color} size={24} />
            </Flex>
          </Avatar>
          <Typography.Title level={4}>{project.name}</Typography.Title>
          <Typography.Text>I want to delete this store</Typography.Text>
        </Flex>
        <Flex direction="column" gap="3" mt="4">
          <Button
            danger
            block
            ghost
            onClick={onDeleteProject}
            loading={deleteProjectLoading}
          >
            Delete this store
          </Button>
        </Flex>
      </Modal>

      <DrawerPaper
        key="lang"
        css={css`
          border: 1px solid var(--color-red-6);
        `}
      >
        <Flex justify="space-between" align="center">
          <Flex direction="column">
            <Typography.Text strong>Delete this store</Typography.Text>
            <Typography.Text>
              Once you delete a store, there is no going back. Please be
              certain.
            </Typography.Text>
          </Flex>
          <Button
            danger
            type="primary"
            onClick={() => {
              setDeleteProjectModalOpen(true);
            }}
            ghost
          >
            Delete this store
          </Button>
        </Flex>
      </DrawerPaper>
    </>
  );
};
