"use client";

import React, { useRef } from "react";
import { AntdRegistry as BaseAntdRegistry } from "@ant-design/nextjs-registry";
import {
  StyleProvider as AntdStyleProvider,
  extractStaticStyle,
} from "antd-style";
import { useServerInsertedHTML } from "next/navigation";

import "antd/dist/antd.css";

export function AntdRegistry({ children }: { children: React.ReactNode }) {
  const isInsert = useRef(false);

  useServerInsertedHTML(() => {
    if (isInsert.current) return;
    isInsert.current = true;

    return <>{extractStaticStyle().map((item) => item.style)}</>;
  });

  return (
    <BaseAntdRegistry>
      <AntdStyleProvider cache={extractStaticStyle.cache}>
        {children}
      </AntdStyleProvider>
    </BaseAntdRegistry>
  );
}
