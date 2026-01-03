import { Theme } from "@/ui-kit/Theme";
import { safiro } from "@/fonts/safiro";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={safiro.variable}>
      <body>
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
