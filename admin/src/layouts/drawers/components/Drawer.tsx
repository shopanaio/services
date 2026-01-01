import { App, Drawer } from 'antd';
import { ReactNode, Suspense, useEffect, useState } from 'react';

import { IEntityDrawerItem } from '@src/layouts/drawers/types';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { EntityDrawersProvider } from '@src/layouts/drawers/components/Provider';
import { DrawerModuleMap } from '@src/layouts/drawers/components/DrawerModuleMap';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IEntityDrawerProps {
  children?: ReactNode;
  level: number;
  drawerItem: IEntityDrawerItem;
}

export const EntityDrawer = ({
  children = null,
  // level,
  drawerItem,
}: IEntityDrawerProps) => {
  const { type, uuid, isDirty } = drawerItem;
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
          'data-testid': 'drawer-confirm-leave',
        },
        cancelButtonProps: {
          'data-testid': 'drawer-cancel-leave',
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
    <Drawer
      open={isOpen}
      onClose={onClose}
      afterOpenChange={clearAfterClose}
      placement="right"
      width="calc(100vw - 100px)"
      push={{ distance: children ? 100 : 0 }}
      closeIcon={null}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      <Suspense fallback={null}>
        <EntityDrawersProvider
          onClose={onClose}
          onForceClose={onForceClose}
          drawerItem={drawerItem}
          onUpdate={onUpdate}
        >
          <Module {...drawerItem} />
        </EntityDrawersProvider>
      </Suspense>
      {children}
    </Drawer>
  );
};
