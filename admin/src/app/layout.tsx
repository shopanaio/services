import { Theme } from "@/ui-kit/theme";
import { ApolloProvider } from "@/graphql/apollo-provider";
import { safiro } from "@/fonts/safiro";
import { inter } from "@/fonts/inter";

import { createLayout, ClientLayoutResolver } from "@/registry";
import { modulesContext } from "@/registry/modules-context";
import { getModalStackDefinitions } from "@/domains/modals";

const { sidebarItems, getModalStackItems } = createLayout({
  modulesContext,
  getModalStackItems: getModalStackDefinitions,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${safiro.variable} ${inter.variable}`}
    >
      <body>
        <ApolloProvider>
          <Theme>
            <ClientLayoutResolver
              sidebarItems={sidebarItems}
              getModalStackItems={getModalStackItems}
            >
              {children}
            </ClientLayoutResolver>
          </Theme>
        </ApolloProvider>
      </body>
    </html>
  );
}
