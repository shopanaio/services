import { Theme } from "@/ui-kit/Theme";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
