import { render, screen } from '@testing-library/react';

describe('Session', () => {
  it('should render', () => {
    render(<div>test</div>);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
