"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "antd";

export type { EditorProps } from "./editor-core";

export const Editor = dynamic(() => import("./editor-core"), {
  ssr: false,
  loading: () => <Skeleton.Input active block style={{ height: 100 }} />,
});
