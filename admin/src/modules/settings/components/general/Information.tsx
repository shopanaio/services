import { IconButton } from '@components/IconButton';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { $projects } from '@modules/projects/store/projects';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { MdOutlineMailOutline, MdOutlinePhone } from 'react-icons/md';
import { StoreInformationModal } from '@modules/settings/components/general/InformationModal';
import { IProjectInfo } from '@src/entity/Project/Project';
import { ShopIcon } from '@src/layouts/app/components/StoreMenu/shop-icon/ShopIcon';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const StoreInformation = ({ project }: { project: IProjectInfo }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <DrawerPaper>
        <DrawerPaperHeader
          name="information"
          title={<FormattedMessage id={t('settings.information.title')} />}
          extra={
            <IconButton
              icon="edit"
              onClick={() => {
                setModalOpen(true);
              }}
            />
          }
        />
        <Flex direction="column" gap="4">
          <Flex align="center" gap="4">
            <ShopIcon size={20} />
            <Box>
              <Typography.Text type="secondary">
                <FormattedMessage id={t('settings.information.name')} />
              </Typography.Text>
              <Box>
                <Typography.Text>{project.name}</Typography.Text>
              </Box>
            </Box>
          </Flex>
          <Flex align="center" gap="4">
            <MdOutlinePhone size={20} />
            <Box>
              <Typography.Text type="secondary">
                <FormattedMessage id={t('settings.information.phones')} />
              </Typography.Text>
              <Box>
                <Typography.Text>
                  {project.phoneNumber || (
                    <FormattedMessage id={t('settings.information.noPhone')} />
                  )}
                </Typography.Text>
              </Box>
            </Box>
          </Flex>
          <Flex align="center" gap="4">
            <MdOutlineMailOutline size={20} />
            <Box>
              <Typography.Text type="secondary">
                <FormattedMessage id={t('settings.information.email')} />
              </Typography.Text>
              <Box>
                <Typography.Text>
                  {project.email || (
                    <FormattedMessage id={t('settings.information.noEmail')} />
                  )}
                </Typography.Text>
              </Box>
            </Box>
          </Flex>
        </Flex>
      </DrawerPaper>
      <StoreInformationModal
        onSubmit={(data: IProjectInfo) => {
          $projects.setCurrentProject(data);
          setModalOpen(false);
        }}
        onClose={() => {
          setModalOpen(false);
        }}
        open={modalOpen}
        project={project}
      />
    </>
  );
};
