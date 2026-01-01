import { App, Modal } from 'antd';
import { ReactNode, Suspense, useEffect, useState } from 'react';

import { IEntityModalItem } from '@src/layouts/modals/types';
import { $modals } from '@src/layouts/modals/store/modals';
import { EntityModalsProvider } from '@src/layouts/modals/components/Provider';
import { ModalModuleMap } from '@src/layouts/modals/components/ModalModuleMap';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IEntityModalProps {
  children?: ReactNode;
  level: number;
  modalItem: IEntityModalItem;
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
    $modals.removeModal(uuid);
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

  const onUpdate = (nextItem: Partial<IEntityModalItem>) => {
    $modals.updateModal({ uuid, ...nextItem });
  };

  const Module = ModalModuleMap[type];
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
      width="80vw"
      centered
      destroyOnClose
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      <Suspense fallback={null}>
        <EntityModalsProvider
          onClose={onClose}
          onForceClose={onForceClose}
          modalItem={modalItem}
          onUpdate={onUpdate}
        >
          <Module {...modalItem} />
        </EntityModalsProvider>
      </Suspense>
      {children}
    </Modal>
  );
};
