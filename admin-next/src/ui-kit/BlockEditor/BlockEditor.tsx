"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "antd";

export type { BlockEditorProps } from "./BlockEditorCore";

export const BlockEditor = dynamic(() => import("./BlockEditorCore"), {
  ssr: false,
  loading: () => <Skeleton.Input active block style={{ height: 200 }} />,
});
