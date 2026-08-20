import { create } from "zustand";
import { navigationMenusMock } from "../mocks/navigation";
import type { NavigationMenu, NavigationMenuFormValues } from "../types";

const cloneMenu = (menu: NavigationMenu): NavigationMenu => structuredClone(menu);

interface NavigationStore {
  menus: NavigationMenu[];
  getMenu: (id?: string) => NavigationMenu | null;
  createMenu: () => NavigationMenu;
  updateMenu: (id: string, values: NavigationMenuFormValues) => void;
  deleteMenu: (id: string) => void;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  menus: navigationMenusMock.map(cloneMenu),
  getMenu: (id) => {
    const menu = get().menus.find((item) => item.id === id);
    return menu ? cloneMenu(menu) : null;
  },
  createMenu: () => {
    const now = new Date().toISOString();
    const menu: NavigationMenu = {
      id: crypto.randomUUID(),
      title: "Untitled",
      slug: crypto.randomUUID(),
      status: "DRAFT",
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ menus: [menu, ...state.menus] }));
    return cloneMenu(menu);
  },
  updateMenu: (id, values) => {
    set((state) => ({
      menus: state.menus.map((menu) =>
        menu.id === id
          ? {
              ...menu,
              ...structuredClone(values),
              updatedAt: new Date().toISOString(),
            }
          : menu,
      ),
    }));
  },
  deleteMenu: (id) => {
    set((state) => ({ menus: state.menus.filter((menu) => menu.id !== id) }));
  },
}));
