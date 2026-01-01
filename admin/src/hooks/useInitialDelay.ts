import { useEffect, useState } from 'react';

export const useInitialDelay = (timeout = 500) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setReady(true);
    }, timeout);
  }, [timeout]);

  return ready;
};
