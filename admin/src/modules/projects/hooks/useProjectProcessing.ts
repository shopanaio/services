import { useEffect, useRef, useState } from 'react';

export const useProjectProcessing = (ready: boolean) => {
  const [progress, setProgress] = useState(0);
  const interval = useRef<number | null>(null);

  useEffect(() => {
    interval.current = window.setInterval(() => {
      setProgress((prev) => {
        if (!ready && prev >= 95) {
          return prev;
        }

        if (prev >= 100) {
          window.clearInterval(interval.current!);
          return 100;
        }

        return prev + 0.4;
      });
    }, 16);

    return () => {
      clearInterval(interval.current!);
    };
  }, [ready]);

  return progress;
};
