import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  collapsed: boolean;
  openKeys: string[];
  setCollapsed: (collapsed: boolean) => void;
  setOpenKeys: (keys: string[]) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      openKeys: [],
      setCollapsed: (collapsed) => set({ collapsed }),
      setOpenKeys: (openKeys) => set({ openKeys }),
    }),
    {
      name: "sidebar-state",
    }
  )
);
