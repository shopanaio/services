import { FiltersForm } from '@modules/discovery/components/FiltersForm';
import { FiltersNav } from '@modules/discovery/components/FiltersNav';
import { MenuForm } from '@modules/discovery/components/MenuForm';
import { MenusNav } from '@modules/discovery/components/MenusNav';
import { NAVIGATION_TABS } from '@modules/discovery/defs';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { useInitialDelay } from '@src/hooks/useInitialDelay';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export interface IRenderNavigationProps {
  isDirty: boolean;
  save: () => Promise<void>;
}

const Navigation = () => {
  const { tab } = useParams();
  const isReady = useInitialDelay();

  const activeTab = useMemo(() => {
    if (!tab) {
      return { tab: NAVIGATION_TABS.FILTERS };
    }

    if (tab.startsWith('m-')) {
      let menuId = tab.slice(2) as number | string;

      if (menuId !== 'new') {
        menuId = parseInt(menuId as string, 10);
      }

      return { tab: NAVIGATION_TABS.MENU, menuId };
    }

    return { tab };
  }, [tab]);

  const { loading, menus } = useMenus();
  const isMenusLoading = !isReady || loading;

  const renderNavigation = ({ isDirty, save }: IRenderNavigationProps) => [
    <FiltersNav
      key="filters"
      isDirty={isDirty}
      activeId={activeTab.tab}
      onOpen={async (tab, shouldSave: boolean) => {
        if (shouldSave) {
          await save();
        }
        router.navigate(routes.discovery.tabLink(tab));
      }}
    />,
    <MenusNav
      key="menus"
      menus={menus}
      isDirty={isDirty}
      loading={isMenusLoading}
      activeId={activeTab.menuId}
      onCreate={
        activeTab.menuId === 'new'
          ? undefined
          : async () => {
              if (isDirty) {
                await save();
              }
              router.navigate(routes.discovery.tabLink(`m-new`));
            }
      }
      onOpen={async (id, shouldSave) => {
        if (shouldSave) {
          await save();
        }
        router.navigate(routes.discovery.tabLink(`m-${id}`));
      }}
    />,
  ];

  if (NAVIGATION_TABS.FILTERS === activeTab.tab) {
    return (
      <FiltersForm tab={activeTab.tab} renderNavigation={renderNavigation} />
    );
  }

};

// eslint-disable-next-line import/no-default-export
export default Navigation;
