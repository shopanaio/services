/**
 * Mock data for Bundles list page
 */

export type BundleType = "FIXED" | "MULTIPACK" | "MIX_AND_MATCH";

export interface IBundleListItem {
  id: string;
  name: string;
  image: string;
  status: "published" | "draft";
  bundleType: BundleType | null;
  createdAt: string;
}

export const mockBundlesList: IBundleListItem[] = [
  // FIXED bundles
  {
    id: "bnd-1",
    name: "Camera Starter Kit",
    image: "https://picsum.photos/seed/camera-kit/200",
    status: "published",
    bundleType: "FIXED",
    createdAt: "2024-11-15T10:00:00Z",
  },
  {
    id: "bnd-2",
    name: "Home Office Essentials",
    image: "https://picsum.photos/seed/office-kit/200",
    status: "published",
    bundleType: "FIXED",
    createdAt: "2024-11-20T08:30:00Z",
  },
  {
    id: "bnd-3",
    name: "Gaming Setup Bundle",
    image: "https://picsum.photos/seed/gaming-kit/200",
    status: "published",
    bundleType: "FIXED",
    createdAt: "2024-10-05T12:00:00Z",
  },
  {
    id: "bnd-4",
    name: "Fitness Tracker Kit",
    image: "https://picsum.photos/seed/fitness-kit/200",
    status: "draft",
    bundleType: "FIXED",
    createdAt: "2024-12-10T16:00:00Z",
  },
  {
    id: "bnd-5",
    name: "Kitchen Appliance Set",
    image: "https://picsum.photos/seed/kitchen-kit/200",
    status: "published",
    bundleType: "FIXED",
    createdAt: "2024-09-28T09:15:00Z",
  },
  {
    id: "bnd-6",
    name: "Travel Essentials Pack",
    image: "https://picsum.photos/seed/travel-kit/200",
    status: "published",
    bundleType: "FIXED",
    createdAt: "2024-11-01T14:30:00Z",
  },
  {
    id: "bnd-7",
    name: "Baby Care Starter Kit",
    image: "https://picsum.photos/seed/baby-kit/200",
    status: "draft",
    bundleType: "FIXED",
    createdAt: "2024-12-15T11:00:00Z",
  },
  // MULTIPACK bundles
  {
    id: "bnd-8",
    name: "6-Pack Craft Beer",
    image: "https://picsum.photos/seed/beer-pack/200",
    status: "published",
    bundleType: "MULTIPACK",
    createdAt: "2024-12-01T09:00:00Z",
  },
  {
    id: "bnd-9",
    name: "12-Pack Energy Drinks",
    image: "https://picsum.photos/seed/energy-pack/200",
    status: "published",
    bundleType: "MULTIPACK",
    createdAt: "2024-11-10T07:45:00Z",
  },
  {
    id: "bnd-10",
    name: "3-Pack T-Shirts",
    image: "https://picsum.photos/seed/tshirt-pack/200",
    status: "published",
    bundleType: "MULTIPACK",
    createdAt: "2024-10-15T13:00:00Z",
  },
  {
    id: "bnd-11",
    name: "5-Pack Socks",
    image: "https://picsum.photos/seed/socks-pack/200",
    status: "draft",
    bundleType: "MULTIPACK",
    createdAt: "2024-12-05T10:30:00Z",
  },
  {
    id: "bnd-12",
    name: "4-Pack Protein Bars",
    image: "https://picsum.photos/seed/protein-pack/200",
    status: "published",
    bundleType: "MULTIPACK",
    createdAt: "2024-11-25T08:00:00Z",
  },
  {
    id: "bnd-13",
    name: "10-Pack Face Masks",
    image: "https://picsum.photos/seed/masks-pack/200",
    status: "published",
    bundleType: "MULTIPACK",
    createdAt: "2024-10-30T15:00:00Z",
  },
  // MIX_AND_MATCH bundles
  {
    id: "bnd-14",
    name: "Build Your Chocolate Box",
    image: "https://picsum.photos/seed/choco-box/200",
    status: "published",
    bundleType: "MIX_AND_MATCH",
    createdAt: "2024-10-20T14:00:00Z",
  },
  {
    id: "bnd-15",
    name: "Custom Gift Box",
    image: "https://picsum.photos/seed/gift-box/200",
    status: "published",
    bundleType: "MIX_AND_MATCH",
    createdAt: "2024-09-05T11:30:00Z",
  },
  {
    id: "bnd-16",
    name: "Design Your Pizza",
    image: "https://picsum.photos/seed/pizza-box/200",
    status: "published",
    bundleType: "MIX_AND_MATCH",
    createdAt: "2024-11-18T17:00:00Z",
  },
  {
    id: "bnd-17",
    name: "Pick Your Smoothie",
    image: "https://picsum.photos/seed/smoothie-mix/200",
    status: "draft",
    bundleType: "MIX_AND_MATCH",
    createdAt: "2024-12-08T09:45:00Z",
  },
  {
    id: "bnd-18",
    name: "Custom Jewelry Set",
    image: "https://picsum.photos/seed/jewelry-set/200",
    status: "published",
    bundleType: "MIX_AND_MATCH",
    createdAt: "2024-10-12T13:15:00Z",
  },
  // Custom bundles (null type)
  {
    id: "bnd-19",
    name: "Holiday Special Pack",
    image: "https://picsum.photos/seed/holiday-pack/200",
    status: "published",
    bundleType: null,
    createdAt: "2024-11-30T10:00:00Z",
  },
  {
    id: "bnd-20",
    name: "Clearance Bundle",
    image: "https://picsum.photos/seed/clearance/200",
    status: "draft",
    bundleType: null,
    createdAt: "2024-12-12T14:00:00Z",
  },
];
