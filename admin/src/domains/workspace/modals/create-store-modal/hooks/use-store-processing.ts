import { useState, useEffect } from "react";

export function useStoreProcessing(ready: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!ready) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [ready]);

  return Math.min(progress, 100);
}
