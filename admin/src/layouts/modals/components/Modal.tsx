import { App, Modal } from 'antd';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { css, Global } from '@emotion/react';

import { IEntityDrawerItem } from '@src/layouts/drawers/types';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { EntityDrawersProvider } from '@src/layouts/drawers/components/Provider';
import { DrawerModuleMap } from '@src/layouts/drawers/components/DrawerModuleMap';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IEntityModalProps {
  children?: ReactNode;
  level: number;
  totalCount: number;
  modalItem: IEntityDrawerItem;
}

const STACK_OFFSET = 8;
const SCALE_FACTOR = 0.03;

const modalAnimationStyles = css`
  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes modalSlideDown {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(40px);
    }
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modalFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .modal-slide-up-enter,
  .modal-slide-up-appear {
    animation: modalSlideUp 0.35s ease-out 0.1s forwards;
    opacity: 0;
  }

  .modal-slide-up-leave {
    animation: modalSlideDown 0.25s ease-in forwards;
  }

  .modal-fade-enter,
  .modal-fade-appear {
    animation: modalFadeIn 0.3s ease-out forwards;
  }

  .modal-fade-leave {
    animation: modalFadeOut 0.25s ease-in forwards;
  }
`;

export const EntityModal = ({
  children = null,
  level,
  totalCount,
  modalItem,
}: IEntityModalProps) => {
  const { type, uuid, isDirty } = modalItem;
  const [isOpen, setIsOpen] = useState(true);
  const { modal } = App.useApp();
  const { formatMessage } = useIntl();

  const hasChildren = !!children;
  const depth = totalCount - level - 1;

  const stackStyles = useMemo(() => {
    const scale = hasChildren ? 1 - SCALE_FACTOR * depth : 1;
    const translateY = hasChildren ? -STACK_OFFSET * depth : 0;

    return {
      transform: `scale(${scale}) translateY(${translateY}px)`,
      transformOrigin: 'top center',
      transition: 'transform 0.3s ease-out',
    };
  }, [hasChildren, depth]);

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
    <>
      <Global styles={modalAnimationStyles} />
      <Modal
        open={isOpen}
        onCancel={onClose}
        afterOpenChange={clearAfterClose}
        footer={null}
        width="calc(100vw - 32px)"
        centered
        closable={false}
        destroyOnClose
        transitionName="modal-slide-up"
        maskTransitionName="modal-fade"
        mask={level === 0}
        styles={{
          body: {
            padding: 0,
            height: 'calc(100vh - 32px)',
            overflow: 'auto',
          },
          content: {
            padding: 0,
          },
          wrapper: {
            ...stackStyles,
            pointerEvents: hasChildren ? 'none' : 'auto',
          },
        }}
      >
        <EntityDrawersProvider
          onClose={onClose}
          onForceClose={onForceClose}
          drawerItem={modalItem}
          onUpdate={onUpdate}
        >
          <Module {...modalItem} />
        </EntityDrawersProvider>
        {children}
      </Modal>
    </>
  );
};
