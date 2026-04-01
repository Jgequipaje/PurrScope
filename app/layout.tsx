import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme";
import StyledComponentsRegistry from "@/lib/registry";

export const metadata: Metadata = {
  title: "PurrScope",
  description: "Automated SEO & Compliance QA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script — runs before any paint to set data-theme from localStorage.
            Prevents FOUC by ensuring the correct theme is applied before React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem("theme");
              var theme = (saved === "dark" || saved === "light")
                ? saved
                : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "dark");
              document.documentElement.setAttribute("data-theme", theme);
            } catch(e) {
              document.documentElement.setAttribute("data-theme", "dark");
            }
          })();
        ` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; }
          /* Set background on html immediately so there is no white flash before body renders */
          html[data-theme="dark"]  { background: #1a1a1a; color: #f0f0f0; }
          html[data-theme="light"] { background: #ffffff; color: #111827; }
          body {
            margin: 0;
            font-family: 'JetBrains Mono', monospace;
            background: inherit;
            color: inherit;
          }
          /* Delay transition until after first paint to avoid animating the initial theme set */
          body.theme-ready {
            transition: background 0.2s ease, color 0.2s ease;
          }
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
