"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "antd";

export type { BlockEditorProps } from "./block-editor-core";

export const BlockEditor = dynamic(() => import("./block-editor-core"), {
  ssr: false,
  loading: () => <Skeleton.Input active block style={{ height: 200 }} />,
});
