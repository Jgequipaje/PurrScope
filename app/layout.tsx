import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme";
import StyledComponentsRegistry from "@/lib/registry";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://purrscope.app";
const SITE_NAME = "PurrScope";
const TITLE = "PurrScope — Automated SEO Checker & Compliance QA";
const DESCRIPTION =
  "Scan page titles and meta descriptions across any site, flag SEO issues, and copy or export results. Supports manual URL input and full sitemap crawl.";
const OG_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 512, height: 512, alt: "PurrScope" }],
  },
  twitter: {
    card: "summary",
    site: "@byjeffdev",
    creator: "@byjeffdev",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script — runs before any paint to set data-theme from localStorage.
            Prevents FOUC by ensuring the correct theme is applied before React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
        `,
          }}
        />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PurrScope",
              url: SITE_URL,
              description: DESCRIPTION,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Any",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              author: { "@type": "Person", name: "byjeff.dev", url: "https://www.byjeff.dev/" },
            }),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          *, *::before, *::after { box-sizing: border-box; }
          /* Set background on html immediately so there is no white flash before body renders */
          html[data-theme="dark"]  { background: #09090b; color: #fafafa; }
          html[data-theme="light"] { background: #ffffff; color: #09090b; }
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
        `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
