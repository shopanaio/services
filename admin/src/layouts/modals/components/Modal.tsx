import { App, Modal } from 'antd';
import { ReactNode, Suspense, useEffect, useState } from 'react';

import { IEntityDrawerItem } from '@src/layouts/drawers/types';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { EntityDrawersProvider } from '@src/layouts/drawers/components/Provider';
import { DrawerModuleMap } from '@src/layouts/drawers/components/DrawerModuleMap';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IEntityModalProps {
  children?: ReactNode;
  level: number;
  modalItem: IEntityDrawerItem;
}

export const EntityModal = ({
  children = null,
  // level,
  modalItem,
}: IEntityModalProps) => {
  const { type, uuid, isDirty } = modalItem;
  const [isOpen, setIsOpen] = useState(true);
  const { modal } = App.useApp();
  const { formatMessage } = useIntl();

  const clearAfterClose = (isOpen: boolean) => {
    if (isOpen) {
      return;
    }
    $drawers.removeDrawer(uuid);
  };

  useEffect(() => () => setIsOpen(false), []);

  const onClose = async () => {
    if (isDirty) {
      const result = await modal.confirm({
        icon: null,
        okButtonProps: {
          'data-testid': 'modal-confirm-leave',
        },
        cancelButtonProps: {
          'data-testid': 'modal-cancel-leave',
        },
        title: formatMessage({ id: t('layouts.drawer.unsavedChanges') }),
        content: formatMessage({
          id: t('layouts.drawer.unsavedChangesContent'),
        }),
      });

      if (!result) {
        return;
      }
    }

    setIsOpen(false);
  };

  const onForceClose = () => {
    setIsOpen(false);
  };

  const onUpdate = (nextItem: Partial<IEntityDrawerItem>) => {
    $drawers.updateDrawer({ uuid, ...nextItem });
  };

  const Module = DrawerModuleMap[type];
  if (!Module) {
    console.error('Unknown entity type');
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      afterOpenChange={clearAfterClose}
      footer={null}
      width="calc(100vw - 32px)"
      centered
      closable={false}
      destroyOnClose
      transitionName="ant-fade"
      maskTransitionName="ant-fade"
      styles={{
        body: {
          padding: 0,
          height: 'calc(100vh - 32px)',
          overflow: 'auto',
        },
        content: {
          padding: 0,
        },
      }}
    >
      <Suspense fallback={null}>
        <EntityDrawersProvider
          onClose={onClose}
          onForceClose={onForceClose}
          drawerItem={modalItem}
          onUpdate={onUpdate}
        >
          <Module {...modalItem} />
        </EntityDrawersProvider>
      </Suspense>
      {children}
    </Modal>
  );
};
