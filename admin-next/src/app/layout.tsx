import { Theme } from "@/ui-kit/Theme";
import { safiro } from "@/fonts/safiro";
import { inter } from "@/fonts/inter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${safiro.variable} ${inter.variable}`}>
      <body>
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
