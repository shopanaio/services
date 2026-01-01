import { Intl } from '@src/lang/Intl';
import { ToggleButton } from '@src/layouts/app/components/Sidebar/ToggleButton';
import { render, screen } from '@testing-library/react';

describe('<ToggleButton />', () => {
  it('render collapsed', () => {
    render(
      <Intl>
        <ToggleButton isCollapsed />
      </Intl>,
    );
    expect(screen.getByTestId('expand-sidebar-button')).toBeInTheDocument();
  });

  it('render expanded', () => {
    render(
      <Intl>
        <ToggleButton isCollapsed={false} />
      </Intl>,
    );
    expect(screen.getByTestId('collapse-sidebar-button')).toBeInTheDocument();
  });
});
