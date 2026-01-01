/* eslint-disable check-file/no-index */

import { App } from '@modules/app/components/App';
import ReactDOM from 'react-dom/client';

// noop
const error = console.error;
console.error = (...args: any[]) => {
  if (args?.[0]?.startsWith?.('The pseudo class "')) {
    return;
  }

  return error(...args);
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(<App />);
