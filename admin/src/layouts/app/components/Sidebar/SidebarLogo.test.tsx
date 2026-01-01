import { SidebarLogo } from '@src/layouts/app/components/Sidebar/SidebarLogo';
import { render, screen } from '@testing-library/react';

describe('<SidebarLogo />', () => {
  it('render collapsed', () => {
    render(<SidebarLogo isCollapsed />);
    expect(screen.getByTestId('sidebar-logo-collapsed')).toBeInTheDocument();
  });

  it('render expanded', () => {
    render(<SidebarLogo isCollapsed={false} />);
    expect(screen.getByTestId('sidebar-logo-expanded')).toBeInTheDocument();
  });
});
