import { Theme } from "@/ui-kit/theme";
import { ApolloProvider } from "@/graphql/apollo-provider";
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
        <ApolloProvider>
          <Theme>{children}</Theme>
        </ApolloProvider>
      </body>
    </html>
  );
}
