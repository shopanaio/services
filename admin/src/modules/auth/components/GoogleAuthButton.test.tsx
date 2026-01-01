import { GoogleAuthButton } from '@modules/auth/components/GoogleAuthButton';
import { render } from '@testing-library/react';

describe('GoogleAuthButton', () => {
  it('should render correctly', () => {
    render(<GoogleAuthButton />);
  });
});
