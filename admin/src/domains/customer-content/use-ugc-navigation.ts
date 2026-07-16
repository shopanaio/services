"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePathParams } from "@/registry";

export function useUgcNavigation() {
  const router = useRouter();
  const { resolvePath } = usePathParams();
  const backToUgc = useCallback(() => {
    router.push(resolvePath("/:orgName/:storeName/customer-content"));
  }, [resolvePath, router]);

  return { backToUgc };
}
