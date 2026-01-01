import { useLayoutEffect, useState } from 'react';

export const usePageHeight = (params: {
  bottom?: number;
  ref: React.MutableRefObject<HTMLElement | null>;
}) => {
  const { ref, bottom: offsetBottom = 0 } = params;
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const { current } = ref;

    if (current) {
      const updateHeight = () => {
        const { top } = current.getBoundingClientRect();
        const { scrollY, innerHeight } = window;
        setHeight(innerHeight - (top + scrollY) - offsetBottom);
      };

      updateHeight();

      window.addEventListener('resize', updateHeight);
      const observer = new ResizeObserver(updateHeight);
      observer.observe(current);

      return () => {
        window.removeEventListener('resize', updateHeight);
        observer.disconnect();
      };
    }
  }, [offsetBottom, ref]);

  return {
    height,
  };
};
