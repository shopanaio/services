import localFont from "next/font/local";

export const safiro = localFont({
  src: [
    {
      path: "./safiro-regular-webfont.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./safiro-medium-webfont.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./safiro-semibold-webfont.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./safiro-bold-webfont.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-safiro",
  display: "swap",
});
