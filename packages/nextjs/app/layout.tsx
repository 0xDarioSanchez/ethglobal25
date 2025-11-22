"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "~~/styles/globals.css";

import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import Web3Provider from "~~/providers/Web3Provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider enableSystem>
          <Web3Provider>
            <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}