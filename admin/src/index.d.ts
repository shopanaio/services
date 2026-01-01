declare module '*.svg' {
  import { ReactElement, SVGProps } from 'react';
  const content: (props: SVGProps<SVGElement>) => ReactElement;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

declare module '*.png' {
  const value: any;
  export = value;
}

type ID = string;
