import { useSelector } from '@reframework/qx';
import { AppLayout } from '@src/layouts/app/components/Layout/Layout';
import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: jest.fn(() => <div data-testid="outlet" />),
}));

jest.mock('@src/layouts/drawers/components/Drawers', () => ({
  ...jest.requireActual('@src/layouts/drawers/components/Drawers'),
  Drawers: jest.fn(() => <div data-testid="drawers" />),
}));

jest.mock('@src/layouts/app/components/Sidebar/Sidebar', () => ({
  ...jest.requireActual('@src/layouts/app/components/Sidebar/Sidebar'),
  Sidebar: jest.fn(() => <div data-testid="sidebar" />),
}));

jest.mock('@reframework/qx', () => ({
  ...jest.requireActual('@reframework/qx'),
  useSelector: jest.fn(),
}));

describe.skip('AppLayout', () => {
  it('renders correctly', () => {
    (useSelector as jest.Mock).mockReturnValue({});

    render(<AppLayout />);
    expect(screen.getByTestId('project-layout')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.getByTestId('drawers')).toBeInTheDocument();
  });
});
