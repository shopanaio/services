import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { render, screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { Intl } from '@src/lang/Intl';
import { Sidebar } from '@src/layouts/app/components/Sidebar/Sidebar';
import { mockMatchMedia } from '@src/utils/test-utils/matchMedia';
import { Menu } from 'antd';
import { sidebarMenuItems } from '@src/layouts/app/components/Sidebar/config';
import { userEvent } from '@testing-library/user-event';

jest.mock('antd', () => {
  const { Menu, ...antd } = jest.requireActual('antd');
  return {
    ...antd,

    Menu: jest.fn((props: object) => (
      <Menu
        {...props}
        mode="vertical"
        triggerSubMenuAction="click"
        openKeys={undefined}
        selectedKeys={undefined}
        onOpenChange={jest.fn()}
      />
    )),
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({ pathname: '/' })),
}));

describe('<Sidebar />', () => {
  beforeAll(() => {
    mockMatchMedia();

    jest
      .spyOn(router, 'navigate')
      .mockImplementation((_: unknown) => Promise.resolve());
  });

  it('selects and expands initial item depending on url', async () => {
    routes.setStoreId('mock-store');

    (useLocation as jest.Mock).mockReturnValue({
      pathname: routes.categories.link,
    });

    render(
      <Intl>
        <Sidebar />
      </Intl>,
    );

    await waitFor(() => {
      expect(Menu).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedKeys: [sidebarMenuItems.categories.key],
          openKeys: [sidebarMenuItems.catalog.key],
        }),
        expect.anything(),
      );
    });
  });

  it('selects item on click', async () => {
    routes.setStoreId('mock-store');

    (useLocation as jest.Mock).mockReturnValue({
      pathname: routes.store.link,
    });

    render(
      <Intl>
        <Sidebar />
      </Intl>,
    );

    await waitFor(() => {
      expect(Menu).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedKeys: [sidebarMenuItems.home.key],
        }),
        expect.anything(),
      );
    });

    /**
     *
     * Ant design Menu component is not working properly with testing library
     * TODO: Make a mock of Menu component
     */

    // fireEvent.click(screen.getByTestId('sidebar-menu-item-catalog'));
    // await waitFor(() => {
    //   expect(Menu).toHaveBeenLastCalledWith(
    //     expect.objectContaining({
    //       openKeys: [sidebarMenuItems.catalog.key],
    //     }),
    //     expect.anything(),
    //   );
    // });

    // fireEvent.click(screen.getByTestId('sidebar-menu-item-products'));
    // await waitFor(() => {
    //   expect(Menu).toHaveBeenLastCalledWith(
    //     expect.objectContaining({
    //       selectedKeys: [sidebarMenuItems.products.key],
    //       openKeys: [sidebarMenuItems.catalog.key],
    //     }),
    //     expect.anything(),
    //   );
    // });

    // await waitFor(() => {
    //   expect(router.navigate).toHaveBeenLastCalledWith(
    //     expect.objectContaining({
    //       to: [sidebarMenuItems.products.key],
    //     }),
    //   );
    // });

    // fireEvent.click(screen.getByTestId('sidebar-menu-item-home'));
    // await waitFor(() => {
    //   expect(Menu).toHaveBeenLastCalledWith(
    //     expect.objectContaining({
    //       selectedKeys: [sidebarMenuItems.home.key],
    //       openKeys: [],
    //     }),
    //     expect.anything(),
    //   );
    // });
    // await waitFor(() => {
    //   expect(router.navigate).toHaveBeenLastCalledWith(
    //     expect.objectContaining({
    //       to: [sidebarMenuItems.home.key],
    //     }),
    //   );
    // });
  });

  it('toggles sidebar', async () => {
    render(
      <Intl>
        <Sidebar />
      </Intl>,
    );

    userEvent.click(screen.getByTestId('collapse-sidebar-button'));
    await waitFor(() => {
      expect(screen.getByTestId('expand-sidebar-button')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('expand-sidebar-button'));
    await waitFor(() => {
      expect(screen.getByTestId('collapse-sidebar-button')).toBeInTheDocument();
    });
  });
});
