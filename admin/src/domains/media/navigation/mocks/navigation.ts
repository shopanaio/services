import type { NavigationEntryOption, NavigationMenu } from "../types";

export const navigationEntryOptions: Record<
  "PRODUCT" | "CATEGORY" | "PAGE",
  NavigationEntryOption[]
> = {
  PRODUCT: [
    { id: "product-1", title: "Classic leather bag", slug: "/products/classic-leather-bag" },
    { id: "product-2", title: "Everyday sneakers", slug: "/products/everyday-sneakers" },
    { id: "product-3", title: "Linen shirt", slug: "/products/linen-shirt" },
  ],
  CATEGORY: [
    { id: "category-1", title: "New arrivals", slug: "/categories/new-arrivals" },
    { id: "category-2", title: "Women", slug: "/categories/women" },
    { id: "category-3", title: "Men", slug: "/categories/men" },
  ],
  PAGE: [
    { id: "page-1", title: "About us", slug: "/pages/about-us" },
    { id: "page-2", title: "Shipping and returns", slug: "/pages/shipping-and-returns" },
    { id: "page-3", title: "Contact", slug: "/pages/contact" },
  ],
};

export const navigationMenusMock: NavigationMenu[] = [
  {
    id: "menu-main",
    title: "Main menu",
    slug: "main-menu",
    status: "ACTIVE",
    createdAt: "2026-04-12T10:15:00.000Z",
    updatedAt: "2026-07-10T14:32:00.000Z",
    items: [
      {
        id: "link-home",
        title: "Home",
        parentId: null,
        slug: "/",
        sortIndex: 0,
        type: "LINK",
        entry: null,
        children: [],
      },
      {
        id: "link-catalog",
        title: "Catalog",
        parentId: null,
        slug: "/categories/new-arrivals",
        sortIndex: 1,
        type: "CATEGORY",
        entry: navigationEntryOptions.CATEGORY[0],
        children: [
          {
            id: "link-women",
            title: "Women",
            parentId: "link-catalog",
            slug: "/categories/women",
            sortIndex: 0,
            type: "CATEGORY",
            entry: navigationEntryOptions.CATEGORY[1],
            children: [],
          },
          {
            id: "link-men",
            title: "Men",
            parentId: "link-catalog",
            slug: "/categories/men",
            sortIndex: 1,
            type: "CATEGORY",
            entry: navigationEntryOptions.CATEGORY[2],
            children: [],
          },
        ],
      },
      {
        id: "link-about",
        title: "About us",
        parentId: null,
        slug: "/pages/about-us",
        sortIndex: 2,
        type: "PAGE",
        entry: navigationEntryOptions.PAGE[0],
        children: [],
      },
    ],
  },
  {
    id: "menu-footer",
    title: "Footer navigation",
    slug: "footer-navigation",
    status: "ACTIVE",
    createdAt: "2026-05-02T09:00:00.000Z",
    updatedAt: "2026-07-08T08:45:00.000Z",
    items: [
      {
        id: "footer-shipping",
        title: "Shipping and returns",
        parentId: null,
        slug: "/pages/shipping-and-returns",
        sortIndex: 0,
        type: "PAGE",
        entry: navigationEntryOptions.PAGE[1],
        children: [],
      },
      {
        id: "footer-contact",
        title: "Contact",
        parentId: null,
        slug: "/pages/contact",
        sortIndex: 1,
        type: "PAGE",
        entry: navigationEntryOptions.PAGE[2],
        children: [],
      },
    ],
  },
  {
    id: "menu-customer-care",
    title: "Customer care",
    slug: "customer-care",
    status: "DRAFT",
    createdAt: "2026-06-18T12:24:00.000Z",
    updatedAt: "2026-06-18T12:24:00.000Z",
    items: [],
  },
];
