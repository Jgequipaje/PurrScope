import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme";
import StyledComponentsRegistry from "@/lib/registry";

export const metadata: Metadata = {
  title: "SEO Checker",
  description: "Internal QA tool for checking SEO metadata",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: 'JetBrains Mono', monospace;
            transition: background 0.2s ease, color 0.2s ease;
          }
          html[data-theme="dark"] body { background: #1a1a1a; color: #f0f0f0; }
          html[data-theme="light"] body { background: #ffffff; color: #111827; }
        ` }} />
      </head>
      <body>
        <StyledComponentsRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
