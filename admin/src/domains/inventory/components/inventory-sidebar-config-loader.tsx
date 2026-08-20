"use client";

import { useEffect, useMemo } from "react";
import type { SidebarItem } from "@/registry";
import { useDynamicSidebarStore } from "@/layouts/app/components/sidebar/dynamic-sidebar-store";
import { useWarehouses } from "@/domains/inventory/warehouse/hooks";

const STOCK_SIDEBAR_KEY = "stock";
const WAREHOUSES_SIDEBAR_LIMIT = 100;

function getWarehouseLabel(warehouse: { name?: string | null; code?: string | null; id: string }) {
  return warehouse.name || warehouse.code || warehouse.id;
}

export function InventorySidebarConfigLoader() {
  const { warehouses } = useWarehouses({ first: WAREHOUSES_SIDEBAR_LIMIT });
  const setChildren = useDynamicSidebarStore((state) => state.setChildren);
  const clearChildren = useDynamicSidebarStore((state) => state.clearChildren);

  const warehouseSidebarItems = useMemo<SidebarItem[]>(
    () =>
      warehouses.map((warehouse, index) => ({
        key: `inventory-warehouse-${warehouse.id}`,
        label: getWarehouseLabel(warehouse),
        order: 10 + index,
        path: `/:orgName/:storeName/inventory/${encodeURIComponent(warehouse.id)}`,
      })),
    [warehouses],
  );

  useEffect(() => {
    setChildren(STOCK_SIDEBAR_KEY, warehouseSidebarItems);
  }, [setChildren, warehouseSidebarItems]);

  useEffect(
    () => () => {
      clearChildren(STOCK_SIDEBAR_KEY);
    },
    [clearChildren],
  );

  return null;
}
